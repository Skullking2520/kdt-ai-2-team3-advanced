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
    """
    OCR 오인식 의심 토큰 비율을 0.0~1.0으로 반환한다.

    PaddleOCR 한국어 인식 시 자주 발생하는 오인식 유형 3가지를 감지한다.
      1. 한글+특수문자 혼재 토큰: 'ㄷ[', '않았디면' 처럼 한글 사이에 기호가 섞임
         → OCR이 유사한 모양의 글자를 특수문자로 잘못 인식한 경우
      2. 한글+영문 혼재 토큰: '사O용', '확인lnk' 처럼 한글 단어 안에 영문자가 섞임
         → 한글 획과 영문 알파벳 모양이 유사해 혼동 (예: 'ㅇ'↔'O', 'ㅣ'↔'l'·'I')
      3. 낱자(자음/모음 단독) 출현: 'ㄷ', 'ㅏ' 처럼 완성형 음절이 아닌 낱자
         → 인식 실패로 음절이 분리된 경우
    """
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
    """
    스미싱 핵심 패턴(URL·전화번호)이 OCR에 의해 끊겨 있는지 감지한다.

    해상도가 낮거나 문자 간격이 넓은 이미지에서 PaddleOCR은 연속된 문자열을
    분리해 읽는다. 예: "http://..." → "h t t p : / / ...", "010-1234" → "0 1 0 - 1 2 3 4"
    이 상태로는 URL/전화번호 정규식 추출이 실패하므로 CLOVA로 재처리해야 한다.

    탐지 패턴:
      - h(공백*)t(공백*)t(공백*)p : URL 프로토콜이 끊긴 경우
      - w(공백*)w(공백*)w         : www 도메인이 끊긴 경우
      - .(공백*)(kr|com|...)      : 도메인 확장자 앞 점이 분리된 경우
      - 0(공백*)1(공백*)0         : 전화번호 앞자리가 끊긴 경우
      - 숫자[OoIl]숫자            : 숫자 0↔O, 1↔l·I 혼동 (예: '0l0' → '010')
    """
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
    """
    추출된 텍스트의 한국어 SMS로서의 품질을 1.0(완벽)~0.0(판독 불가)으로 점수화한다.

    한국어 SMS는 대부분 한글로 구성되므로 아래 기준으로 감점한다.

    감점 항목:
      - 텍스트 길이 < 10자  (-0.5): 텍스트 추출 자체가 거의 실패한 경우
      - 한글 비율 < 0.45    (-0.5): 한국어 SMS인데 한글이 절반 미만 → 전면 오인식
      - 한글 비율 < 0.65    (-0.25): 한글 비율이 낮음 → 부분 오인식
      - 특수문자 출현       (-0.2): {}[]|^~■□ 등은 OCR이 한글을 기호로 잘못 읽은 흔적
      - 특수문자 비율 > 5%  (-0.2): 광범위한 오인식
      - 반복 텍스트         (-0.4): 같은 영역을 이중 인식한 경우
      - 오타 의심 토큰 존재 (-0.2~0.6): _typo_suspicion_score 비율에 따라 단계 감점
      - broken smishing 패턴(-0.3): URL·전화번호가 끊겨 있어 스미싱 탐지 불가 우려
    """
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
    """
    PaddleOCR 결과를 그대로 사용할지, CLOVA로 재처리할지 판단한다.
    하나라도 해당되면 CLOVA fallback을 수행한다.

    판단 기준:
      - 빈 텍스트: 이미지에서 텍스트를 전혀 못 읽은 경우
      - avg_confidence < 0.95: 인식된 문자의 평균 신뢰도.
          한국어 인쇄체 SMS는 선명하면 0.99 이상이 일반적.
          0.95 미만이면 여러 문자가 불확실하게 읽혔다는 의미.
      - min_confidence < 0.85: 가장 낮은 신뢰도.
          0.85 미만이면 핵심 단어 하나가 통째로 잘못 읽혔을 수 있음.
      - OCR 노이즈(_has_ocr_noise): 한글+기호 혼재, 낱자 출현 등 명백한 오인식 흔적
      - broken smishing 패턴: URL·전화번호가 끊겨 스미싱 탐지 정확도가 저하될 수 있음
      - quality_score < 0.9: 위 항목들을 종합한 품질 점수가 기준 미달
    """
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
    except Exception as e:
        logger.warning("[OCR] CLOVA 호출 실패(%s) → PaddleOCR 결과 유지", e)

    if not paddle_text.strip():
        raise RuntimeError("이미지에서 텍스트를 추출할 수 없습니다. 더 선명한 이미지를 사용해 주세요.")

    return paddle_text
