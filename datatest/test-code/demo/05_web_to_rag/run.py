"""데모 05 — Web→RAG 파이프라인

흐름:
    S3 crawled/web/batch*.csv
        → Gemini 2.5 Flash 로 SMS 문자 생성 (기사 기반 증강)
        → JSONL 저장
        → Pinecone 업로드

주요 옵션:
    --dry-run       API 호출 없이 파싱·프롬프트 확인만
    --skip-upload   JSONL만 저장, Pinecone 업로드 생략
    --batch NAME    특정 배치 파일만 처리 (예: batch1.csv)
    --out PATH      출력 JSONL 경로 (기본: web_rag.jsonl)

실행:
    cd /path/to/test-code
    uv run python demo/05_web_to_rag/run.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from pipeline.web_to_rag import run, DEFAULT_OUT


def main():
    print("=" * 60)
    print("데모 05 — Web→RAG 파이프라인")
    print("=" * 60)
    print()
    print("흐름: S3 batch*.csv → Gemini 2.5 Flash SMS 생성 → Pinecone 업로드")
    print()
    print("실행 모드:")
    print("  1) dry-run     (S3/API 호출 없이 파싱만 확인, 빠름)")
    print("  2) 실제 실행   (S3 + Gemini + Pinecone, 시간 소요)")
    print("  3) 특정 배치만 (S3 특정 batch*.csv만 처리)")
    print("  4) 업로드 생략 (JSONL만 생성, Pinecone 업로드 건너뜀)")
    choice = input("선택 [1/2/3/4]: ").strip()

    dry_run     = False
    skip_upload = False
    target_batch = None

    if choice == "1":
        dry_run = True
    elif choice == "3":
        target_batch = input("배치 파일명 입력 (예: batch1.csv): ").strip()
    elif choice == "4":
        skip_upload = True

    out_path = DEFAULT_OUT
    custom = input(f"출력 JSONL 경로 [기본: {DEFAULT_OUT}]: ").strip()
    if custom:
        out_path = Path(custom)

    print()
    print(f"실행: dry_run={dry_run}, skip_upload={skip_upload}, batch={target_batch}")
    print()

    run(
        out_path=out_path,
        dry_run=dry_run,
        target_batch=target_batch,
        skip_upload=skip_upload,
    )

    print()
    print("완료.")


if __name__ == "__main__":
    main()
