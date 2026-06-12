# ruff: noqa: E501

from __future__ import annotations

import argparse
import csv
from pathlib import Path

HARD_NEGATIVE_ROWS = [
    ("배송이 완료되었습니다. 이용해주셔서 감사합니다.", 0, "배송_normal", "manual_keyword_hard_negative_v3"),
    ("택배가 도착했습니다. 문 앞에 보관했습니다.", 0, "택배_배송_normal", "manual_keyword_hard_negative_v3"),
    ("카드 자동납부 등록이 완료되었습니다.", 0, "카드_결제_normal", "manual_keyword_hard_negative_v4"),
    ("카드 정기결제 등록이 완료되었습니다.", 0, "카드_결제_normal", "manual_keyword_hard_negative_v4"),
    ("계좌이체가 정상적으로 완료되었습니다.", 0, "계좌_normal", "manual_keyword_hard_negative_v3"),
    ("인증번호는 123456입니다. 타인에게 알려주지 마세요.", 0, "인증_normal", "manual_keyword_hard_negative_v3"),
    ("회의 자료 링크를 공유드립니다.", 0, "링크_normal", "manual_keyword_hard_negative_v4"),
    ("업무 자료 링크는 메일에서 확인해 주세요.", 0, "링크_normal", "manual_keyword_hard_negative_v4"),
    ("환급 처리가 완료되었습니다.", 0, "환급_normal", "manual_keyword_hard_negative_v3"),
    ("대출 금리 안내입니다.", 0, "대출_normal", "manual_keyword_hard_negative_v3"),
]


HARD_POSITIVE_ROWS = [
    ("배송 주소 오류로 반송 예정입니다. 아래 링크에서 수정하세요. <URL>", 1, "배송_url_phishing", "manual_finance_hard_positive_v1"),
    ("고객님의 계좌가 정지되었습니다. 보안인증을 진행하세요.", 1, "계좌_인증_개인정보_phishing", "manual_finance_hard_positive_v1"),
    ("카드 사용이 제한되었습니다. 본인확인을 위해 링크에 접속하세요.", 1, "카드_결제_인증_phishing", "manual_finance_hard_positive_v1"),
    ("환급금 수령을 위해 개인정보를 입력하세요.", 1, "환급_개인정보_수수료_phishing", "manual_finance_hard_positive_v1"),
    ("대출 승인 확인을 위해 수수료를 입금하세요.", 1, "대출_수수료_입금_phishing", "manual_finance_hard_positive_v1"),
    ("대출 승인을 위해 보증금을 먼저 입금하세요.", 1, "대출_보증금_입금_phishing", "manual_finance_hard_positive_v2"),
    ("최신 모바일 게임을 받으려면 지금 링크에 접속하세요. <URL>", 1, "앱_다운로드_url_phishing", "manual_recall_hard_positive_v3"),
    ("쇼핑 캐시백 지급 대상입니다. 앱에서 계정을 확인하세요. <URL>", 1, "쇼핑_캐시백_url_phishing", "manual_recall_hard_positive_v3"),
    ("카드가 잠겼습니다. 액세스 복원을 위해 링크에서 세부정보를 확인하세요. <URL>", 1, "카드_잠김_url_phishing", "manual_recall_hard_positive_v3"),
    ("패키지를 배송할 수 없습니다. 주소 확인 링크를 눌러 주세요. <URL>", 1, "배송_url_phishing", "manual_recall_hard_positive_v3"),
    ("전화번호를 보내주시면 직접 상담을 연결해 드립니다.", 1, "전화번호_회신유도_phishing", "manual_recall_hard_positive_v3"),
]


def write_rows(path: Path, rows: list[tuple[str, int, str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["text", "label", "keyword_group", "source"])
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate small v3 hard-example CSVs for encoder retraining."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "data" / "generated",
    )
    args = parser.parse_args()

    write_rows(args.output_dir / "hard_negative_keywords_normal.csv", HARD_NEGATIVE_ROWS)
    write_rows(args.output_dir / "hard_positive_finance_phishing.csv", HARD_POSITIVE_ROWS)
    write_rows(
        args.output_dir / "keyword_challenge_set.csv",
        [(text, label, group, source) for text, label, group, source in HARD_NEGATIVE_ROWS]
        + [(text, label, group, source) for text, label, group, source in HARD_POSITIVE_ROWS],
    )

    print(f"Generated v3 hard-example CSVs in {args.output_dir}")


if __name__ == "__main__":
    main()
