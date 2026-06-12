import os
import csv
import time

from PIL import Image
import pytesseract


IMAGE_DIR = "images"
OUTPUT_FILE = "tesseract_psm6_result.csv"


def main():
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

        image = Image.open(image_path)

        # psm 6: 이미지를 하나의 텍스트 블록으로 보고 인식
        config = "--psm 6"

        extracted_text = pytesseract.image_to_string(
            image,
            lang="kor+eng",
            config=config
        )

        extracted_text = extracted_text.replace("\n", " ").strip()

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
    print(f"Tesseract psm 6 결과 저장 완료: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()