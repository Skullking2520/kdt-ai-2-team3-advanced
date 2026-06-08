import os
import csv
import time

try:
    from paddleocr import PaddleOCR
except ImportError:
    print("PaddleOCR이 설치되어 있지 않습니다.")
    print("아래 명령어로 설치하세요:")
    print("pip3 install paddleocr paddlepaddle")
    raise


IMAGE_DIR = "images"
OUTPUT_FILE = "paddleocr_result.csv"


def extract_text_from_result(result):
    texts = []

    if not result:
        return ""

    for item in result:
        data = None

        # PaddleOCR 3.x 결과가 dict처럼 들어오는 경우
        if isinstance(item, dict):
            data = item

        # PaddleOCR 3.x 결과 객체가 json 속성을 가진 경우
        elif hasattr(item, "json"):
            data = item.json

        if not data:
            continue

        # 경우 1: rec_texts가 바로 있는 경우
        if "rec_texts" in data:
            texts.extend(data["rec_texts"])

        # 경우 2: res 안에 rec_texts가 있는 경우
        elif "res" in data and isinstance(data["res"], dict):
            res = data["res"]

            if "rec_texts" in res:
                texts.extend(res["rec_texts"])

    return " ".join(texts)


def main():
    ocr = PaddleOCR(
        lang="korean",
        use_textline_orientation=True
    )

    image_files = []

    for filename in os.listdir(IMAGE_DIR):
        if filename.lower().endswith((".png", ".jpg", ".jpeg")):
            image_files.append(filename)

    image_files.sort()

    if not image_files:
        print("images 폴더 안에 이미지 파일이 없습니다.")
        return

    results = []

    for filename in image_files:
        image_path = os.path.join(IMAGE_DIR, filename)

        start_time = time.time()

        ocr_result = ocr.predict(image_path)
        extracted_text = extract_text_from_result(ocr_result)

        elapsed_time = time.time() - start_time

        print(f"{filename} -> {extracted_text}")

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
    print(f"PaddleOCR 결과 저장 완료: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
