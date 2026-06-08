import csv
import re


GROUND_TRUTH_FILE = "ground_truth.csv"

OCR_RESULT_FILES = {
    "EasyOCR": "easyocr_result.csv",
    "PaddleOCR": "paddleocr_result.csv",
    "Tesseract psm 6": "tesseract_psm6_result.csv",
    "CLOVA OCR": "clova_result.csv",
    "PaddleOCR + CLOVA fallback": "fallback_ocr_result.csv",
}


def compact_text(text):
    """
    공백, 줄바꿈, 탭을 제거해서 비교용 문자열 생성.
    띄어쓰기 차이 때문에 점수가 낮아지는 것을 방지.
    """
    if text is None:
        return ""

    text = str(text)
    text = re.sub(r"\s+", "", text)

    return text.strip()


def levenshtein_distance(a, b):
    """
    문자 단위 편집거리 계산.
    삽입, 삭제, 교체를 모두 1로 계산.
    """
    len_a = len(a)
    len_b = len(b)

    dp = []

    for i in range(len_a + 1):
        row = []
        for j in range(len_b + 1):
            row.append(0)
        dp.append(row)

    for i in range(len_a + 1):
        dp[i][0] = i

    for j in range(len_b + 1):
        dp[0][j] = j

    for i in range(1, len_a + 1):
        for j in range(1, len_b + 1):
            if a[i - 1] == b[j - 1]:
                cost = 0
            else:
                cost = 1

            dp[i][j] = min(
                dp[i - 1][j] + 1,        # 삭제
                dp[i][j - 1] + 1,        # 삽입
                dp[i - 1][j - 1] + cost  # 교체
            )

    return dp[len_a][len_b]


def load_ground_truth():
    data = {}

    with open(GROUND_TRUTH_FILE, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            filename = row["filename"]
            text = row["text"]
            data[filename] = text

    return data


def load_ocr_result(file_path):
    """
    OCR 결과 파일을 읽어 filename 기준으로 저장.

    지원 컬럼:
    - final_text: fallback 파이프라인 최종 결과
    - ocr_text: 일반 OCR 결과
    - text: 기타 텍스트 컬럼
    """
    data = {}

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            filename = row["filename"]

            if "final_text" in row and row["final_text"] != "":
                text = row["final_text"]
            elif "ocr_text" in row and row["ocr_text"] != "":
                text = row["ocr_text"]
            elif "text" in row and row["text"] != "":
                text = row["text"]
            else:
                text = ""

            processing_time = 0.0

            if "processing_time" in row and row["processing_time"] != "":
                try:
                    processing_time = float(row["processing_time"])
                except ValueError:
                    processing_time = 0.0

            data[filename] = {
                "text": text,
                "processing_time": processing_time
            }

    return data


def evaluate_one_ocr(ocr_name, result_file):
    ground_truth = load_ground_truth()
    ocr_result = load_ocr_result(result_file)

    total_count = 0
    exact_match_count = 0

    total_distance = 0
    total_gt_chars = 0

    total_time = 0.0
    time_count = 0

    for filename, gt_text in ground_truth.items():
        if filename not in ocr_result:
            print(f"[경고] {ocr_name}: {filename} 결과가 없습니다.")
            continue

        pred_text = ocr_result[filename]["text"]
        processing_time = ocr_result[filename]["processing_time"]

        gt_compact = compact_text(gt_text)
        pred_compact = compact_text(pred_text)

        total_count += 1

        if gt_compact == pred_compact:
            exact_match_count += 1

        distance = levenshtein_distance(gt_compact, pred_compact)
        total_distance += distance
        total_gt_chars += len(gt_compact)

        total_time += processing_time
        time_count += 1

    if total_count == 0:
        compact_exact = 0.0
    else:
        compact_exact = exact_match_count / total_count

    if total_gt_chars == 0:
        cer = 1.0
    else:
        cer = total_distance / total_gt_chars

    char_accuracy = max(0.0, 1.0 - cer)

    if time_count == 0:
        avg_time = 0.0
    else:
        avg_time = total_time / time_count

    return {
        "OCR": ocr_name,
        "compact exact": compact_exact,
        "CER": cer,
        "문자 정확도": char_accuracy,
        "평균 처리시간": avg_time,
        "평가 개수": total_count
    }


def main():
    results = []

    for ocr_name, result_file in OCR_RESULT_FILES.items():
        try:
            result = evaluate_one_ocr(ocr_name, result_file)
            results.append(result)
        except FileNotFoundError:
            print(f"[건너뜀] {ocr_name}: {result_file} 파일이 없습니다.")

    print("OCR\tcompact exact\tCER\t문자 정확도\t평균 처리시간\t평가 개수")

    for result in results:
        print(
            f"{result['OCR']}\t"
            f"{result['compact exact'] * 100:.2f}%\t"
            f"{result['CER']:.4f}\t"
            f"{result['문자 정확도'] * 100:.2f}%\t"
            f"{result['평균 처리시간']:.4f}초\t"
            f"{result['평가 개수']}"
        )


if __name__ == "__main__":
    main()