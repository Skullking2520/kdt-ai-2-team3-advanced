import os
import csv
import time

try:
    import easyocr
except ImportError:
    print("EasyOCR이 설치되어 있지 않습니다.")
    print("아래 명령어로 설치하세요:")
    print("pip3 install easyocr")
    raise


IMAGE_DIR = "images"
OUTPUT_FILE = "easyocr_result.csv"


def main():
    # 한국어 + 영어 OCR 모델 사용
    reader = easyocr.Reader(["ko", "en"], gpu=False)

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

        ocr_result = reader.readtext(image_path, detail=0)
        extracted_text = " ".join(ocr_result)

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
    print(f"EasyOCR 결과 저장 완료: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()