import os
import re
import csv
import time
import uuid
import json
import mimetypes
from typing import Any, Dict, List, Tuple

import requests
from paddleocr import PaddleOCR


IMAGE_DIR = "images"
OUTPUT_FILE = "fallback_ocr_result.csv"


# -----------------------------
# 1. PaddleOCR 결과 추출
# -----------------------------

def extract_texts_and_scores_from_paddle(result: Any) -> Tuple[List[str], List[float]]:
    """
    PaddleOCR 3.x predict 결과에서 텍스트, confidence score, 좌표를 추출한다.
    rec_boxes의 좌표를 기준으로 정렬해서 텍스트 순서 뒤섞임을 보정한다.
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

            if callable(json_attr):
                data = json_attr()
            else:
                data = json_attr

        if not data:
            continue

        if isinstance(data, dict) and "res" in data and isinstance(data["res"], dict):
            res = data["res"]
        else:
            res = data

        if not isinstance(res, dict):
            continue

        rec_texts = res.get("rec_texts", [])
        rec_scores = res.get("rec_scores", [])
        rec_boxes = res.get("rec_boxes", [])

        for index, text in enumerate(rec_texts):
            text = str(text).strip()

            if not text:
                continue

            score = 0.0

            if index < len(rec_scores):
                try:
                    score = float(rec_scores[index])
                except (ValueError, TypeError):
                    score = 0.0

            # 기본값: 좌표가 없으면 기존 순서 유지
            x_min = index
            y_min = 0
            x_max = index
            y_max = 0

            if index < len(rec_boxes):
                box = rec_boxes[index]

                try:
                    # PaddleOCR 3.x rec_boxes는 보통 [x_min, y_min, x_max, y_max]
                    x_min = int(box[0])
                    y_min = int(box[1])
                    x_max = int(box[2])
                    y_max = int(box[3])
                except Exception:
                    x_min = index
                    y_min = 0
                    x_max = index
                    y_max = 0

            items.append({
                "text": text,
                "score": score,
                "x_min": x_min,
                "y_min": y_min,
                "x_max": x_max,
                "y_max": y_max,
            })

    if not items:
        return [], []

    # 줄 단위 정렬.
    # 한 줄 이미지에서는 x_min 정렬이 핵심이고,
    # 여러 줄 이미지에서는 y_group으로 줄을 먼저 묶은 뒤 x_min으로 정렬한다.
    for item in items:
        item_height = max(1, item["y_max"] - item["y_min"])
        line_bucket_size = max(20, item_height // 2)
        item["y_group"] = item["y_min"] // line_bucket_size

    items.sort(key=lambda value: (value["y_group"], value["x_min"]))

    # 중복 제거
    texts = []
    scores = []

    for item in items:
        text = item["text"]

        if text in texts:
            continue

        texts.append(text)
        scores.append(item["score"])

    return texts, scores


def run_paddle_ocr(ocr: PaddleOCR, image_path: str) -> Tuple[str, float, float]:
    """
    PaddleOCR 실행 후:
    - 좌표 정렬된 텍스트
    - 평균 confidence
    - 최소 confidence 반환
    """
    result = ocr.predict(image_path)
    texts, scores = extract_texts_and_scores_from_paddle(result)

    text = " ".join(texts).strip()

    if scores:
        avg_confidence = sum(scores) / len(scores)
        min_confidence = min(scores)
    else:
        avg_confidence = 0.0
        min_confidence = 0.0

    return text, avg_confidence, min_confidence


# -----------------------------
# 2. CLOVA OCR 호출
# -----------------------------

def get_file_format(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".png":
        return "png"

    if ext in [".jpg", ".jpeg"]:
        return "jpg"

    return "png"


def extract_text_from_clova_response(data: Dict[str, Any]) -> str:
    texts = []

    images = data.get("images", [])

    for image in images:
        fields = image.get("fields", [])

        for field in fields:
            text = field.get("inferText", "")

            if text:
                texts.append(text)

    return " ".join(texts).strip()


def run_clova_ocr(image_path: str, filename: str) -> str:
    invoke_url = os.environ.get("CLOVA_OCR_URL")
    secret_key = os.environ.get("CLOVA_OCR_SECRET")

    if not invoke_url or not secret_key:
        raise ValueError(
            "CLOVA_OCR_URL 또는 CLOVA_OCR_SECRET 환경변수가 없습니다. "
            "터미널에서 export 명령어로 먼저 설정하세요."
        )

    file_format = get_file_format(filename)

    request_json = {
        "version": "V2",
        "requestId": str(uuid.uuid4()),
        "timestamp": int(round(time.time() * 1000)),
        "images": [
            {
                "format": file_format,
                "name": filename,
            }
        ],
    }

    payload = {
        "message": json.dumps(request_json, ensure_ascii=False)
    }

    mime_type, _ = mimetypes.guess_type(image_path)

    if mime_type is None:
        mime_type = "application/octet-stream"

    with open(image_path, "rb") as image_file:
        files = {
            "file": (filename, image_file, mime_type)
        }

        headers = {
            "X-OCR-SECRET": secret_key
        }

        response = requests.post(
            invoke_url,
            headers=headers,
            data=payload,
            files=files,
            timeout=30
        )

    if response.status_code != 200:
        print(f"[CLOVA 오류] {filename} 응답 코드: {response.status_code}")
        print(response.text)
        return ""

    data = response.json()
    return extract_text_from_clova_response(data)


# -----------------------------
# 3. OCR 품질 판단 로직
# -----------------------------

def compact_text(text: str) -> str:
    return re.sub(r"\s+", "", text or "")


def count_korean_chars(text: str) -> int:
    return sum(1 for ch in text if "가" <= ch <= "힣")


def typo_suspicion_score(text: str) -> float:
    """
    OCR 결과에 깨진 토큰이 얼마나 많은지 추정한다.
    0에 가까울수록 정상, 1에 가까울수록 이상.
    """
    tokens = re.findall(
        r"[가-힣A-Za-z0-9\[\]\{\}\|\^\~•ㄱ-ㅎㅏ-ㅣ\-−]+",
        text
    )

    if not tokens:
        return 1.0

    suspicious_count = 0

    for token in tokens:
        # 한글 단어 안에 특수문자가 섞인 경우: 시[용, ㄷ[
        if re.search(r"[가-힣]", token) and re.search(r"[\[\]\{\}\|\^\~•−]", token):
            suspicious_count += 1
            continue

        # 한글 단어 안에 알파벳이 이상하게 섞인 경우: 상태H이기
        if re.search(r"[가-힣]", token) and re.search(r"[A-Za-z]", token):
            suspicious_count += 1
            continue

        # 자음/모음만 남은 경우: ㄷ, ㅏ 등
        if re.search(r"[ㄱ-ㅎㅏ-ㅣ]", token):
            suspicious_count += 1
            continue

        # 특수문자가 포함된 짧은 조각
        if len(token) <= 2 and re.search(r"[\[\]\{\}\|\^\~•−]", token):
            suspicious_count += 1
            continue

    return suspicious_count / len(tokens)


def has_ocr_noise(text: str) -> bool:
    """
    명확한 OCR 깨짐 신호를 탐지한다.
    하나라도 걸리면 CLOVA fallback 후보로 본다.
    """
    # 한글 사이에 알파벳이 섞인 경우: 상태H이기
    if re.search(r"[가-힣]+[A-Za-z]+[가-힣]+", text):
        return True

    # 한글 단어 안에 대괄호/중괄호/기호가 섞인 경우: 시[용
    if re.search(r"[가-힣]+[\[\]\{\}\|\\^~•−]+[가-힣]*", text):
        return True

    # 자음/모음 단독이 섞인 경우: ㄷ[, ㅏ 등
    if re.search(r"[ㄱ-ㅎㅏ-ㅣ]", text):
        return True

    # 불필요한 기호
    if any(ch in text for ch in ["•", "−", "■", "□", "◆", "◇"]):
        return True

    return False


def has_repeated_text(text: str) -> bool:
    """
    같은 문장이 반복 저장되는 경우를 탐지한다.
    """
    compact = compact_text(text)

    if len(compact) < 20:
        return False

    half = len(compact) // 2

    left = compact[:half]
    right = compact[half:half * 2]

    return left == right


def has_broken_smishing_pattern(text: str) -> bool:
    """
    URL, 전화번호, 금액 등 스미싱 핵심 패턴이 깨진 흔적을 탐지한다.
    """
    # http가 띄어져 있거나 깨진 경우
    if re.search(r"h\s*t\s*t\s*p", text, re.IGNORECASE):
        return True

    # www가 깨진 경우
    if re.search(r"w\s*w\s*w", text, re.IGNORECASE):
        return True

    # .kr, .com 등이 이상하게 띄어진 경우
    if re.search(r"\.\s*(kr|com|net|org|co\.kr)", text, re.IGNORECASE):
        return True

    # 전화번호 010이 이상하게 띄어진 경우
    if re.search(r"0\s*1\s*0", text):
        return True

    # 숫자 사이에 O, I, l 등이 섞인 경우
    if re.search(r"[0-9][OoIl][0-9]", text):
        return True

    return False


def ocr_quality_score(text: str) -> float:
    """
    OCR 결과 문자열 기반 품질 점수.
    1.0에 가까울수록 좋고, 0.0에 가까울수록 낮다.
    """
    text = text.strip()
    compact = compact_text(text)

    if not compact:
        return 0.0

    score = 1.0

    # 1. 너무 짧으면 감점
    if len(compact) < 10:
        score -= 0.5

    # 2. 한글 비율 감점
    korean_count = count_korean_chars(compact)
    korean_ratio = korean_count / len(compact)

    if korean_ratio < 0.45:
        score -= 0.5
    elif korean_ratio < 0.65:
        score -= 0.25

    # 3. 이상 특수문자 비율 감점
    weird_chars = set("{}[]|\\^~•■□◆◇●○※−")
    weird_count = sum(1 for ch in compact if ch in weird_chars)
    weird_ratio = weird_count / len(compact)

    if weird_ratio > 0:
        score -= 0.2

    if weird_ratio > 0.05:
        score -= 0.2

    # 4. 반복 텍스트 감점
    if has_repeated_text(text):
        score -= 0.4

    # 5. 오탈자 의심 토큰 감점
    typo_ratio = typo_suspicion_score(text)

    if typo_ratio > 0:
        score -= 0.2

    if typo_ratio > 0.1:
        score -= 0.2

    if typo_ratio > 0.2:
        score -= 0.2

    # 6. URL/전화번호 등 핵심 패턴 깨짐 감점
    if has_broken_smishing_pattern(text):
        score -= 0.3

    return max(0.0, min(1.0, score))


def need_clova_fallback(
    text: str,
    avg_confidence: float,
    min_confidence: float,
    quality_threshold: float = 0.9,
    avg_conf_threshold: float = 0.95,
    min_conf_threshold: float = 0.85,
) -> bool:
    """
    True면 PaddleOCR 결과를 신뢰하지 않고 CLOVA OCR을 호출한다.
    """
    # 1. 텍스트가 비어 있으면 fallback
    if not text.strip():
        return True

    # 2. PaddleOCR 내부 confidence 기반 판단
    if avg_confidence < avg_conf_threshold:
        return True

    if min_confidence < min_conf_threshold:
        return True

    # 3. 명확한 OCR 노이즈
    if has_ocr_noise(text):
        return True

    # 4. 스미싱 핵심 패턴 깨짐
    if has_broken_smishing_pattern(text):
        return True

    # 5. 문자열 기반 품질 점수
    return ocr_quality_score(text) < quality_threshold


# -----------------------------
# 4. 전체 fallback 파이프라인
# -----------------------------

def main():
    print("[1] PaddleOCR 초기화 시작")

    paddle_ocr = PaddleOCR(
        lang="korean",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        text_det_thresh=0.05,
        text_det_box_thresh=0.05,
        text_rec_score_thresh=0.0,
    )

    print("[2] PaddleOCR 초기화 완료")

    image_files = []

    for filename in os.listdir(IMAGE_DIR):
        if filename.lower().endswith((".png", ".jpg", ".jpeg")):
            image_files.append(filename)

    image_files.sort()

    if not image_files:
        print("images 폴더 안에 이미지 파일이 없습니다.")
        return

    results = []

    for index, filename in enumerate(image_files, start=1):
        image_path = os.path.join(IMAGE_DIR, filename)

        print(f"[{index}/{len(image_files)}] PaddleOCR 실행: {filename}")

        start_time = time.time()

        paddle_text, avg_confidence, min_confidence = run_paddle_ocr(
            paddle_ocr,
            image_path
        )

        quality = ocr_quality_score(paddle_text)

        fallback = need_clova_fallback(
            paddle_text,
            avg_confidence,
            min_confidence
        )

        final_text = paddle_text
        used_ocr = "PaddleOCR"

        if fallback:
            print(
                f"  → 품질 낮음"
                f"(quality={quality:.2f}, "
                f"avg_conf={avg_confidence:.3f}, "
                f"min_conf={min_confidence:.3f}), CLOVA OCR 호출"
            )

            try:
                clova_text = run_clova_ocr(image_path, filename)

                if clova_text:
                    final_text = clova_text
                    used_ocr = "CLOVA OCR"
                else:
                    print("  → CLOVA 결과가 비어 있어 PaddleOCR 결과 유지")

            except Exception as e:
                print(f"  → CLOVA 호출 실패: {e}")
                print("  → PaddleOCR 결과 유지")
        else:
            print(
                f"  → 품질 양호"
                f"(quality={quality:.2f}, "
                f"avg_conf={avg_confidence:.3f}, "
                f"min_conf={min_confidence:.3f}), PaddleOCR 결과 사용"
            )

        elapsed_time = time.time() - start_time

        print(f"  → 최종 OCR: {used_ocr}")
        print(f"  → 결과: {final_text}")

        results.append({
            "filename": filename,
            "paddle_text": paddle_text,
            "paddle_avg_confidence": round(avg_confidence, 6),
            "paddle_min_confidence": round(min_confidence, 6),
            "quality_score": round(quality, 4),
            "fallback_used": fallback,
            "used_ocr": used_ocr,
            "final_text": final_text,
            "processing_time": round(elapsed_time, 4),
        })

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "filename",
                "paddle_text",
                "paddle_avg_confidence",
                "paddle_min_confidence",
                "quality_score",
                "fallback_used",
                "used_ocr",
                "final_text",
                "processing_time",
            ],
        )
        writer.writeheader()
        writer.writerows(results)

    print()
    print(f"fallback OCR 결과 저장 완료: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()