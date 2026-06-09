"""
OCR 서비스 — PaddleOCR 1차 인식 + CLOVA fallback 파이프라인

벤치마크 코드(ocr_benchmark/ocr_fallback_pipeline.py)의 핵심 로직을
백엔드 서비스용으로 변환한 모듈.

주요 변경사항:
  - 입력: 파일 경로 → base64 data URI
  - PaddleOCR 인스턴스: 매번 생성 → 서버 시작 시 싱글톤으로 1회 초기화
  - CLOVA 호출: 파일 열기 → BytesIO (임시 파일 불필요)
  - 출력: CSV 저장 → str 반환
"""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
import tempfile
import time
import uuid
from typing import Any

import requests

logger = logging.getLogger(__name__)

from ..core.pydantic_settings import settings

# ─── PaddleOCR 싱글톤 ─────────────────────────────────────────────────────────
# 초기화 비용이 크므로 서버 시작 시 한 번만 생성
_paddle_ocr = None


def _get_paddle_ocr():
    global _paddle_ocr
    if _paddle_ocr is None:
        try:
            from paddleocr import PaddleOCR
        except ImportError as exc:
            raise RuntimeError("paddleocr 패키지가 설치되어 있지 않습니다.") from exc

        _paddle_ocr = PaddleOCR(
            lang="korean",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            text_det_thresh=0.05,
            text_det_box_thresh=0.05,
            text_rec_score_thresh=0.0,
        )
    return _paddle_ocr


# ─── base64 파싱 ──────────────────────────────────────────────────────────────

def _parse_data_uri(data_uri: str) -> tuple[bytes, str, str]:
    """
    base64 data URI → (이미지 바이트, MIME 타입, 확장자)
    예) "data:image/jpeg;base64,/9j/..." → (b"...", "image/jpeg", ".jpeg")
    """
    header, data = data_uri.split(",", 1)
    mime_type = header.split(":")[1].split(";")[0]
    ext = "." + mime_type.split("/")[1]
    return base64.b64decode(data), mime_type, ext


# ─── PaddleOCR 실행 ───────────────────────────────────────────────────────────

def _extract_texts_and_scores(result: Any) -> tuple[list[str], list[float]]:
    """
    PaddleOCR 3.x predict 결과에서 텍스트·신뢰도·좌표를 추출한다.
    y_group → x_min 순으로 정렬해 텍스트 순서 뒤섞임을 보정한다.
    """
    items = []

    if not result:
        return [], []

    for item in result:
        data = None

        if isinstance(item, dict):
            data = item
        elif hasattr(item, "json"):
            json_attr = getattr(item, "json")
            data = json_attr() if callable(json_attr) else json_attr

        if not data:
            continue

        if isinstance(data, dict) and "res" in data and isinstance(data["res"], dict):
            res = data["res"]
        else:
            res = data

        if not isinstance(res, dict):
            continue

        rec_texts  = res.get("rec_texts", [])
        rec_scores = res.get("rec_scores", [])
        rec_boxes  = res.get("rec_boxes", [])

        for idx, text in enumerate(rec_texts):
            text = str(text).strip()
            if not text:
                continue

            score = 0.0
            try:
                score = float(rec_scores[idx]) if idx < len(rec_scores) else 0.0
            except (ValueError, TypeError):
                pass

            x_min = y_min = x_max = y_max = idx
            if idx < len(rec_boxes):
                try:
                    box = rec_boxes[idx]
                    x_min, y_min, x_max, y_max = int(box[0]), int(box[1]), int(box[2]), int(box[3])
                except Exception:
                    pass

            items.append({"text": text, "score": score,
                          "x_min": x_min, "y_min": y_min,
                          "x_max": x_max, "y_max": y_max})

    if not items:
        return [], []

    for item in items:
        h = max(1, item["y_max"] - item["y_min"])
        item["y_group"] = item["y_min"] // max(20, h // 2)

    items.sort(key=lambda v: (v["y_group"], v["x_min"]))

    # 중복 제거
    texts, scores = [], []
    for item in items:
        if item["text"] not in texts:
            texts.append(item["text"])
            scores.append(item["score"])

    return texts, scores


def _run_paddle_ocr(image_bytes: bytes, ext: str) -> tuple[str, float, float]:
    """
    임시 파일에 이미지를 저장한 뒤 PaddleOCR 실행.
    반환: (인식 텍스트, 평균 신뢰도, 최소 신뢰도)
    """
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        result = _get_paddle_ocr().predict(tmp_path)
    finally:
        os.unlink(tmp_path)

    texts, scores = _extract_texts_and_scores(result)
    text = " ".join(texts).strip()

    if scores:
        return text, sum(scores) / len(scores), min(scores)
    return text, 0.0, 0.0


# ─── CLOVA OCR 호출 ───────────────────────────────────────────────────────────

def _extract_text_from_clova_response(data: dict[str, Any]) -> str:
    texts = []
    for image in data.get("images", []):
        for field in image.get("fields", []):
            text = field.get("inferText", "")
            if text:
                texts.append(text)
    return " ".join(texts).strip()


def _run_clova_ocr(image_bytes: bytes, mime_type: str, ext: str) -> str:
    """
    CLOVA OCR API 호출. BytesIO로 전송하므로 임시 파일 불필요.
    환경변수: CLOVA_OCR_URL, CLOVA_OCR_SECRET
    """
    invoke_url = settings.CLOVA_OCR_URL
    secret_key = settings.CLOVA_OCR_SECRET

    if not invoke_url or not secret_key:
        raise ValueError("CLOVA_OCR_URL 또는 CLOVA_OCR_SECRET 환경변수가 설정되지 않았습니다.")

    filename = f"image{ext}"
    request_json = {
        "version": "V2",
        "requestId": str(uuid.uuid4()),
        "timestamp": int(round(time.time() * 1000)),
        "images": [{"format": ext.lstrip("."), "name": filename}],
    }

    response = requests.post(
        invoke_url,
        headers={"X-OCR-SECRET": secret_key},
        data={"message": json.dumps(request_json, ensure_ascii=False)},
        files={"file": (filename, io.BytesIO(image_bytes), mime_type)},
        timeout=30,
    )

    if response.status_code != 200:
        raise RuntimeError(f"CLOVA OCR 응답 오류: {response.status_code} {response.text}")

    return _extract_text_from_clova_response(response.json())


# ─── OCR 품질 판단 ────────────────────────────────────────────────────────────

def _compact(text: str) -> str:
    return re.sub(r"\s+", "", text or "")


def _count_korean(text: str) -> int:
    return sum(1 for ch in text if "가" <= ch <= "힣")


def _typo_suspicion_score(text: str) -> float:
    tokens = re.findall(r"[가-힣A-Za-z0-9\[\]\{\}\|\^\~•ㄱ-ㅎㅏ-ㅣ\-−]+", text)
    if not tokens:
        return 1.0

    suspicious = 0
    for token in tokens:
        if re.search(r"[가-힣]", token) and re.search(r"[\[\]\{\}\|\^\~•−]", token):
            suspicious += 1
        elif re.search(r"[가-힣]", token) and re.search(r"[A-Za-z]", token):
            suspicious += 1
        elif re.search(r"[ㄱ-ㅎㅏ-ㅣ]", token):
            suspicious += 1
        elif len(token) <= 2 and re.search(r"[\[\]\{\}\|\^\~•−]", token):
            suspicious += 1

    return suspicious / len(tokens)


def _has_ocr_noise(text: str) -> bool:
    if re.search(r"[가-힣]+[A-Za-z]+[가-힣]+", text):
        return True
    if re.search(r"[가-힣]+[\[\]\{\}\|\\^~•−]+[가-힣]*", text):
        return True
    if re.search(r"[ㄱ-ㅎㅏ-ㅣ]", text):
        return True
    if any(ch in text for ch in ["•", "−", "■", "□", "◆", "◇"]):
        return True
    return False


def _has_repeated_text(text: str) -> bool:
    compact = _compact(text)
    if len(compact) < 20:
        return False
    half = len(compact) // 2
    return compact[:half] == compact[half:half * 2]


def _has_broken_smishing_pattern(text: str) -> bool:
    if re.search(r"h\s*t\s*t\s*p", text, re.IGNORECASE):
        return True
    if re.search(r"w\s*w\s*w", text, re.IGNORECASE):
        return True
    if re.search(r"\.\s*(kr|com|net|org|co\.kr)", text, re.IGNORECASE):
        return True
    if re.search(r"0\s*1\s*0", text):
        return True
    if re.search(r"[0-9][OoIl][0-9]", text):
        return True
    return False


def _ocr_quality_score(text: str) -> float:
    compact = _compact(text)
    if not compact:
        return 0.0

    score = 1.0

    if len(compact) < 10:
        score -= 0.5

    korean_ratio = _count_korean(compact) / len(compact)
    if korean_ratio < 0.45:
        score -= 0.5
    elif korean_ratio < 0.65:
        score -= 0.25

    weird_chars = set("{}[]|\\^~•■□◆◇●○※−")
    weird_ratio = sum(1 for ch in compact if ch in weird_chars) / len(compact)
    if weird_ratio > 0:
        score -= 0.2
    if weird_ratio > 0.05:
        score -= 0.2

    if _has_repeated_text(text):
        score -= 0.4

    typo_ratio = _typo_suspicion_score(text)
    if typo_ratio > 0:
        score -= 0.2
    if typo_ratio > 0.1:
        score -= 0.2
    if typo_ratio > 0.2:
        score -= 0.2

    if _has_broken_smishing_pattern(text):
        score -= 0.3

    return max(0.0, min(1.0, score))


def _need_clova_fallback(
    text: str,
    avg_confidence: float,
    min_confidence: float,
    quality_threshold: float = 0.9,
    avg_conf_threshold: float = 0.95,
    min_conf_threshold: float = 0.85,
) -> bool:
    if not text.strip():
        return True
    if avg_confidence < avg_conf_threshold:
        return True
    if min_confidence < min_conf_threshold:
        return True
    if _has_ocr_noise(text):
        return True
    if _has_broken_smishing_pattern(text):
        return True
    return _ocr_quality_score(text) < quality_threshold


# ─── 공개 진입점 ──────────────────────────────────────────────────────────────

async def extract_text_from_image(data_uri: str) -> str:
    """
    base64 data URI 이미지에서 텍스트를 추출한다.

    1. PaddleOCR 1차 인식
    2. 품질 기준 미달 시 CLOVA OCR fallback
    3. CLOVA 실패 또는 빈 결과면 PaddleOCR 결과 반환
    """
    image_bytes, mime_type, ext = _parse_data_uri(data_uri)

    paddle_text, avg_conf, min_conf = _run_paddle_ocr(image_bytes, ext)
    quality = _ocr_quality_score(paddle_text)

    logger.info(
        "[OCR] PaddleOCR 결과 | avg_conf=%.3f min_conf=%.3f quality=%.2f | text=%r",
        avg_conf, min_conf, quality, paddle_text[:80],
    )

    if not _need_clova_fallback(paddle_text, avg_conf, min_conf):
        logger.info("[OCR] PaddleOCR 품질 양호 → PaddleOCR 결과 사용")
        return paddle_text

    logger.info("[OCR] 품질 기준 미달 → CLOVA fallback 시도")
    try:
        clova_text = _run_clova_ocr(image_bytes, mime_type, ext)
        if clova_text:
            logger.info("[OCR] CLOVA 성공 → CLOVA 결과 사용 | text=%r", clova_text[:80])
            return clova_text
        logger.warning("[OCR] CLOVA 빈 결과 → PaddleOCR 결과 유지")
        return paddle_text
    except Exception as e:
        logger.warning("[OCR] CLOVA 호출 실패(%s) → PaddleOCR 결과 유지", e)
        return paddle_text
