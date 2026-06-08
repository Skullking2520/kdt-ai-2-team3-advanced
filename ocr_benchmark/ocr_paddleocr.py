import os
import csv
import time

from paddleocr import PaddleOCR


IMAGE_DIR = "images"
OUTPUT_FILE = "paddleocr_result.csv"


def extract_texts(result):
    texts = []

    if not result:
        return texts

    for item in result:
        data = None

        # PaddleOCR 3.x 결과가 dict인 경우
        if isinstance(item, dict):
            data = item

        # PaddleOCR 3.x 결과 객체가 json 속성/메서드를 가진 경우
        elif hasattr(item, "json"):
            json_attr = getattr(item, "json")

            if callable(json_attr):
                data = json_attr()
            else:
                data = json_attr

        if not data:
            continue

        # 경우 1: rec_texts가 바로 있는 경우
        if isinstance(data, dict) and "rec_texts" in data:
            texts.extend(data["rec_texts"])

        # 경우 2: res 안에 rec_texts가 있는 경우
        elif isinstance(data, dict) and "res" in data:
            res = data["res"]

            if isinstance(res, dict):
                if "rec_texts" in res:
                    texts.extend(res["rec_texts"])
                elif "texts" in res:
                    texts.extend(res["texts"])

    # 중복 제거
    unique_texts = []

    for text in texts:
        text = str(text).strip()

        if text and text not in unique_texts:
            unique_texts.append(text)

    return unique_texts


def main():
    print("[1] PaddleOCR 3.6.0 방식 실행 시작", flush=True)

    ocr = PaddleOCR(
        lang="korean",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        text_det_thresh=0.05,
        text_det_box_thresh=0.05,
        text_rec_score_thresh=0.0,
    )

    print("[2] PaddleOCR 객체 생성 완료", flush=True)

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

        print(f"[{index}/{len(image_files)}] OCR 시작: {filename}", flush=True)

        start_time = time.time()

        result = ocr.predict(image_path)
        texts = extract_texts(result)
        extracted_text = " ".join(texts).strip()

        elapsed_time = time.time() - start_time

        print(f"{filename} -> {extracted_text}", flush=True)

        results.append({
            "filename": filename,
            "ocr_text": extracted_text,
            "processing_time": round(elapsed_time, 4)
        })

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["filename", "ocr_text", "processing_time"]
        )
        writer.writeheader()
        writer.writerows(results)

    print()
    print(f"PaddleOCR 결과 저장 완료: {OUTPUT_FILE}", flush=True)


if __name__ == "__main__":
    main()