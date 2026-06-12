import os
import csv
import time
import uuid
import json
import mimetypes

import requests


IMAGE_DIR = "images"
OUTPUT_FILE = "clova_result.csv"


def get_file_format(filename):
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".png":
        return "png"
    elif ext in [".jpg", ".jpeg"]:
        return "jpg"
    else:
        return "png"


def extract_text_from_clova_response(data):
    texts = []

    images = data.get("images", [])

    for image in images:
        fields = image.get("fields", [])

        for field in fields:
            text = field.get("inferText", "")
            if text:
                texts.append(text)

    return " ".join(texts)


def call_clova_ocr(image_path, filename):
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
                "name": filename
            }
        ]
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
        print(f"[오류] {filename} 응답 코드: {response.status_code}")
        print(response.text)
        return ""

    data = response.json()
    return extract_text_from_clova_response(data)


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

        try:
            extracted_text = call_clova_ocr(image_path, filename)
        except Exception as e:
            print(f"[실패] {filename}: {e}")
            extracted_text = ""

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
    print(f"CLOVA OCR 결과 저장 완료: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()