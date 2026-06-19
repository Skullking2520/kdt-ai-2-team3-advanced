"""JSONL 파일 → Pinecone 벡터 업로드.

각 줄 형식 (필수 키):
{
    "id":               "case_xxx",
    "document":         "SMS 본문 텍스트",
    "source":           "train_data | crawling_kr | crawling_foreign | user_input | ragas_golden",
    "security_type":    "스미싱 | 피싱 | 보이스피싱 | zero-day | 악성앱 | analysis",
    "language":         "ko | en",
    "original_doc_id":  "doc-uuid",
    "doc_version":      "v2.1",
    "pipeline_version": "p-0.4.0",
    "collected_at":     "2026-06-01T10:00:00+00:00",
    "updated_at":       "2026-06-01T10:00:00+00:00",
    "has_url":          0,
    "has_phone":        0,
    "has_money":        0,
    "has_account":      0,
    "special_keyword_count": 0,
    // 선택
    "chunk_idx":        0,
    "source_url":       null,
    "question":         null,
    "ground_truth":     null
}

실행:
    uv run python -m pipeline.seed_pinecone path/to/file.jsonl
    uv run python -m pipeline.seed_pinecone path/to/file.jsonl --batch-size 50
    uv run python -m pipeline.seed_pinecone path/to/file.jsonl --dry-run
"""

import argparse
import json
import sys
from pathlib import Path

from .logger import log_error, log_info
from .vector_io import upsert_cases

_RECORD_REQUIRED = {"id", "document"}


def _load_jsonl(path: Path) -> list[tuple[int, dict]]:
    """JSONL 파일 로드. 파싱 실패 줄 스킵."""
    records = []
    with path.open(encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                records.append((lineno, json.loads(line)))
            except json.JSONDecodeError as e:
                print(f"[SKIP] 줄 {lineno}: JSON 파싱 실패 → {e}", file=sys.stderr)
    return records


def _parse_record(lineno: int, record: dict) -> tuple[str, str, dict] | None:
    """(lineno, record) → (id, document, metadata) or None."""
    missing = _RECORD_REQUIRED - record.keys()
    if missing:
        print(f"[SKIP] 줄 {lineno}: 필수 키 누락 {missing}", file=sys.stderr)
        return None

    id_ = record["id"]
    document = record["document"]

    if not isinstance(id_, str) or not id_.strip():
        print(f"[SKIP] 줄 {lineno}: id가 비어있음", file=sys.stderr)
        return None
    if not isinstance(document, str) or not document.strip():
        print(f"[SKIP] 줄 {lineno}: document가 비어있음", file=sys.stderr)
        return None

    meta = {k: v for k, v in record.items() if k not in ("id", "document")}
    return id_, document, meta


def run(jsonl_path: Path, batch_size: int = 100, dry_run: bool = False) -> None:
    raw_records = _load_jsonl(jsonl_path)
    print(f"[INFO] 로드 완료: {len(raw_records)}건 ({jsonl_path})")

    if not raw_records:
        print("[INFO] 처리할 레코드 없음. 종료.")
        return

    ids, documents, metadatas = [], [], []
    skip = 0

    for lineno, record in raw_records:
        parsed = _parse_record(lineno, record)
        if parsed is None:
            skip += 1
            continue
        id_, document, meta = parsed
        ids.append(id_)
        documents.append(document)
        metadatas.append(meta)

    print(f"[INFO] 유효: {len(ids)}건 / 스킵: {skip}건")

    if dry_run:
        print("[DRY-RUN] 업로드 생략. 종료.")
        return

    if not ids:
        print("[INFO] 업로드할 레코드 없음. 종료.")
        return

    total = len(ids)
    success = 0
    fail = 0

    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        b_ids = ids[start:end]
        b_docs = documents[start:end]
        b_metas = metadatas[start:end]

        try:
            upsert_cases(b_ids, b_docs, b_metas)
            success += len(b_ids)
            print(f"[OK] 배치 {start + 1}~{end}: {len(b_ids)}건 완료")
        except Exception as e:
            fail += len(b_ids)
            print(f"[FAIL] 배치 {start + 1}~{end}: {e}", file=sys.stderr)

    print(f"\n[완료] 성공: {success}건 / 실패: {fail}건 / 스킵: {skip}건")
    log_info("seed_pinecone", "run", f"완료 — 성공:{success} 실패:{fail} 스킵:{skip}")


def main() -> None:
    parser = argparse.ArgumentParser(description="JSONL → Pinecone 벡터 업로드")
    parser.add_argument("jsonl", type=Path, help="업로드할 JSONL 파일 경로")
    parser.add_argument("--batch-size", type=int, default=100, help="배치 크기 (기본: 100)")
    parser.add_argument("--dry-run", action="store_true", help="파싱·검증만 하고 업로드 생략")
    args = parser.parse_args()

    if not args.jsonl.exists():
        print(f"[ERROR] 파일 없음: {args.jsonl}", file=sys.stderr)
        sys.exit(1)
    if args.jsonl.suffix != ".jsonl":
        print(f"[WARN] 확장자가 .jsonl이 아님: {args.jsonl}")

    run(args.jsonl, batch_size=args.batch_size, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
