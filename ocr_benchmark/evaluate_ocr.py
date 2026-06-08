import csv
import re


GROUND_TRUTH_FILE = "ground_truth.csv"

# 지금은 EasyOCR 결과만 평가
OCR_RESULT_FILES = {
    "EasyOCR": "easyocr_result.csv",
    # 나중에 결과 파일이 생기면 아래처럼 추가하면 됨
    "PaddleOCR": "paddleocr_result.csv",
    "Tesseract psm 6": "tesseract_psm6_result.csv",
    "CLOVA OCR": "clova_result.csv"
}


def compact_text(text):
    """
    비교를 쉽게 하기 위해 공백, 줄바꿈, 특수한 빈칸 등을 제거.
    """
    if text is None:
        return ""

    text = str(text)
    text = re.sub(r"\s+", "", text)
    return text.strip()


def levenshtein_distance(a, b):
    """
    두 문자열이 몇 글자나 다른지 계산.
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
    data = {}

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            filename = row["filename"]

            # easyocr_result.csv에서는 ocr_text라는 컬럼을 사용
            if "ocr_text" in row:
                text = row["ocr_text"]
            elif "text" in row:
                text = row["text"]
            else:
                text = ""

            data[filename] = text

    return data


def evaluate_one_ocr(ocr_name, result_file):
    ground_truth = load_ground_truth()
    ocr_result = load_ocr_result(result_file)

    total_count = 0
    exact_match_count = 0

    total_distance = 0
    total_gt_chars = 0

    for filename, gt_text in ground_truth.items():
        if filename not in ocr_result:
            print(f"[경고] {ocr_name}: {filename} 결과가 없습니다.")
            continue

        pred_text = ocr_result[filename]

        gt_compact = compact_text(gt_text)
        pred_compact = compact_text(pred_text)

        total_count += 1

        if gt_compact == pred_compact:
            exact_match_count += 1

        distance = levenshtein_distance(gt_compact, pred_compact)
        total_distance += distance
        total_gt_chars += len(gt_compact)

    if total_count == 0:
        compact_exact = 0
    else:
        compact_exact = exact_match_count / total_count

    if total_gt_chars == 0:
        cer = 1
    else:
        cer = total_distance / total_gt_chars

    char_accuracy = 1 - cer

    return {
        "OCR": ocr_name,
        "compact exact": compact_exact,
        "CER": cer,
        "문자 정확도": char_accuracy
    }


def main():
    results = []

    for ocr_name, result_file in OCR_RESULT_FILES.items():
        result = evaluate_one_ocr(ocr_name, result_file)
        results.append(result)

    print("OCR\tcompact exact\tCER\t문자 정확도")

    for result in results:
        print(
            f"{result['OCR']}\t"
            f"{result['compact exact'] * 100:.2f}%\t"
            f"{result['CER']:.4f}\t"
            f"{result['문자 정확도'] * 100:.2f}%"
        )


if __name__ == "__main__":
    main()