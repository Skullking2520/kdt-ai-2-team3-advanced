"""스미싱 파이프라인 통합 테스트.

SMS 한 건을 받아 4개 Stage를 거치며 MySQL/S3/ChromaDB를 모두 사용한다.

실행:
    # 1) ChromaDB 시드 데이터 적재 (최초 1회)
    uv run python -m pipeline.seed_chroma

    # 2) 통합 테스트 실행
    uv run python -m pipeline.integration_test

흐름:
    Step 0: UUID 생성 + processing_log 행 생성
    Step 1: 전처리 -> S3 raw/, labeled/ 저장
    Step 2: MySQL blacklist 조회
    Step 3: 모델 추론 (mock score=55) -> S3 processed/
    Step 4: ChromaDB 유사도 검색 + LLM reason (mock) -> S3 reason/
    Step 5: 검증 (MySQL + S3 + ChromaDB 결과 확인)
"""

import hashlib
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from pipeline.config import S3_BUCKET, SCORE_RAG_HIGH, SCORE_RAG_LOW, SCORE_THRESHOLD
from pipeline.mysql_io import (
    fetch_log,
    get_conn,
    insert_processing_log,
    lookup_blacklist,
    update_stage,
)
from pipeline.preprocessor import build_labeled_record
from pipeline.s3_io import get_jsonl, append_pipeline
from pipeline.schema import make_blacklist_inference, make_model_inference
from pipeline.vector_io import search_similar

KST = ZoneInfo("Asia/Seoul")

# 통합 테스트 입력 SMS — 애매한 케이스 (RAG 분기 타게 score=55 mock)
INPUT_SMS = "긴급 안내드립니다 본인인증 절차가 필요합니다 확인 바랍니다"


# ============================================================
# Mock 함수들 (실제 구현체로 갈아끼울 자리)
# ============================================================

def mock_model_inference(text: str) -> dict:
    """SmsClassifier 대체 mock.

    실제 환경에선 final_model을 로드해 사용.
    여기선 score=55 하드코딩 (RAG 분기 타도록).
    """
    return make_model_inference(
        score=55,
        features="본인인증=1, 긴급=1",
        model_version="mock_v0.0",
    )


def mock_llm_reason(text: str, similar_cases: list[dict] | None) -> str:
    """LLM 응답 mock. 실제 환경에선 Claude/OpenAI API 호출."""
    if similar_cases:
        top = similar_cases[0]
        return (
            f"이 메시지는 '{top['metadata'].get('category', '미상')}' 패턴과 "
            f"유사하며(유사도 {top['similarity']}), KISA 신고 사례와 일치하는 "
            f"특징을 보입니다. [mock reason]"
        )
    return "본인 인증을 빙자한 의심 메시지입니다. [mock reason]"


# ============================================================
# Stage 함수들
# ============================================================

def stage0_initialize(sms_text: str) -> tuple[str, str, dict]:
    """Step 0: ID 발급 + MySQL processing_log에 raw 단계 등록."""
    sms_id = str(uuid.uuid4())
    now = datetime.now(KST)
    received_at = now.isoformat()
    text_hash = hashlib.sha256(sms_text.encode("utf-8")).hexdigest()

    raw_record = {
        "id": sms_id,
        "text": sms_text,
        "received_at": received_at,
        "source": "integration_test",
    }

    insert_processing_log({
        "id": sms_id,
        "source_text_hash": text_hash,
        "current_stage": "raw",
        "stage_completed_at": {"raw": received_at},
        "source": "integration_test",
    })

    batch_id = now.strftime("%Y%m%d_%H%M%S")
    return sms_id, batch_id, raw_record


def stage1_preprocess(
    sms_id: str, batch_id: str, raw_record: dict,
) -> dict:
    """Step 1: 전처리 -> S3 raw/, labeled/ 저장."""
    # raw 저장
    raw_path = append_pipeline("raw", [raw_record])
    update_stage(sms_id, "raw", s3_path=raw_path, line_no=0)

    # labeled 저장
    labeled_record = build_labeled_record(raw_record)
    labeled_path = append_pipeline("labeled", [labeled_record])
    update_stage(sms_id, "labeled", s3_path=labeled_path, line_no=0)

    return labeled_record


def stage2_static_filter(sms_id: str, labeled_record: dict) -> dict | None:
    """Step 2: MySQL blacklist 조회."""
    urls = labeled_record.get("url", [])
    phones = labeled_record.get("phone", [])
    return lookup_blacklist(urls, phones)


def stage3_model_inference(
    sms_id: str, batch_id: str, labeled_record: dict, blacklist_hit: dict | None,
) -> dict:
    """Step 3: 모델 추론 -> S3 processed/ 저장."""
    if blacklist_hit:
        # schema.py에서 blacklist 추론 결과 생성
        inference = make_blacklist_inference(blacklist_hit["pattern_type"])
        static_fields = {
            "static_filter_hit": True,
            "matched_blacklist_id": blacklist_hit["id"],
            "matched_pattern_type": blacklist_hit["pattern_type"],
            "matched_pattern_value": blacklist_hit["pattern_value"],
        }
    else:
        # schema.py에서 모델 추론 결과 생성
        inference = mock_model_inference(labeled_record["text"])
        static_fields = {
            "static_filter_hit": False,
            "matched_blacklist_id": None,
            "matched_pattern_type": None,
            "matched_pattern_value": None,
        }

    processed_record = {
        **labeled_record,
        **static_fields,
        **inference,
        "processed_at": datetime.now(KST).isoformat(),
    }

    # S3 저장
    processed_path = append_pipeline("processed", [processed_record])


    # MySQL 갱신
    update_stage(
        sms_id, "processed",
        s3_path=processed_path, line_no=0,
        extras={
            "label": inference["label"],
            "score": inference["score"],
            "risk_level": inference["risk_level"],
            "model_version": inference["model_version"],
            "static_filter_hit": static_fields["static_filter_hit"],
            "matched_blacklist_id": static_fields["matched_blacklist_id"],
        },
    )
    return processed_record


def stage4_llm_reason(
    sms_id: str, batch_id: str, processed_record: dict,
) -> dict:
    """Step 4: LLM reason 생성 (애매하면 RAG 사용) -> S3 reason/ 저장."""
    score = processed_record["score"]

    if processed_record.get("static_filter_hit"):
        reasoning_method = "skipped_blacklist"
        similar_cases = None
        reason = (
            f"블랙리스트에 등록된 "
            f"{processed_record.get('matched_pattern_type')} 패턴 매칭."
        )
    elif SCORE_RAG_LOW <= score <= SCORE_RAG_HIGH:
        reasoning_method = "llm_with_rag"
        similar_cases = search_similar(processed_record["text"], n_results=3)
        reason = mock_llm_reason(processed_record["text"], similar_cases)
    else:
        reasoning_method = "llm_only"
        similar_cases = None
        reason = mock_llm_reason(processed_record["text"], None)

    reason_record = {
        **processed_record,
        "reasoning_method": reasoning_method,
        "rag_similar_cases": similar_cases,
        "reason": reason,
        "llm_model": "mock_v0.0",
        "reasoned_at": datetime.now(KST).isoformat(),
    }

    reason_path = append_pipeline("reason", [reason_record])
    update_stage(
        sms_id, "reason",
        s3_path=reason_path, line_no=0,
        extras={
            "reasoning_method": reasoning_method,
            "llm_model": "mock_v0.0",
        },
    )

    return reason_record


# ============================================================
# 검증
# ============================================================

def verify(sms_id: str, reason_record: dict) -> None:
    """Step 5: MySQL + S3 + ChromaDB 결과 일관성 검증."""
    print("\n" + "=" * 60)
    print("검증")
    print("=" * 60)

    # 1) MySQL 검증
    log = fetch_log(sms_id)
    assert log is not None, "MySQL processing_log에 행 없음"
    assert log["current_stage"] == "reason", \
        f"current_stage 기대 'reason', 실제 '{log['current_stage']}'"
    print(f"\n[MySQL] processing_log.{sms_id[:8]}")
    print(f"  current_stage  : {log['current_stage']}")
    print(f"  label / score  : {log['label']} / {log['score']}")
    print(f"  risk_level     : {log['risk_level']}")
    print(f"  static_hit     : {log['static_filter_hit']}")
    print(f"  reason_method  : {log['reasoning_method']}")
    print(f"  s3 paths:")
    for stage in ("raw", "labeled", "processed", "reason"):
        path = log.get(f"s3_{stage}_path") or "-"
        line = log.get(f"s3_{stage}_line_no")
        print(f"    {stage:9s} : {path}  (line {line})")

    # 2) S3 각 단계 파일에서 우리 레코드 잘 들어갔나
    print(f"\n[S3] 각 단계 파일에서 id 매칭 확인")
    for stage in ("raw", "labeled", "processed", "reason"):
        s3_uri = log[f"s3_{stage}_path"]
        key = s3_uri.replace(f"s3://{S3_BUCKET}/", "")
        records = get_jsonl(key)
        target = next((r for r in records if r["id"] == sms_id), None)
        assert target is not None, f"{stage} 파일에 id={sms_id} 없음"
        print(f"  {stage:9s} : {len(records)} 건 / 우리 id 매칭 OK")

    # 3) ChromaDB 결과
    print(f"\n[ChromaDB] 유사도 검색 결과")
    rag = reason_record.get("rag_similar_cases")
    if not rag:
        print("  (RAG 사용 안 함)")
    else:
        for i, case in enumerate(rag, 1):
            cat = case["metadata"].get("category", "?")
            print(f"  {i}. [{cat}] {case['document']}")
            print(f"     similarity={case['similarity']}")

    # 4) 최종 reason
    print(f"\n[Reason]")
    print(f"  {reason_record['reason']}")

    print("\n[OK] 통합 테스트 통과")


# ============================================================
# 메인
# ============================================================

def main() -> None:
    print("=" * 60)
    print("스미싱 파이프라인 통합 테스트")
    print("=" * 60)
    print(f"\n입력 SMS: {INPUT_SMS}")

    print("\n[Step 0] ID 발급 + MySQL processing_log 초기 등록")
    sms_id, batch_id, raw_record = stage0_initialize(INPUT_SMS)
    print(f"  sms_id   : {sms_id}")
    print(f"  batch_id : {batch_id}")

    print("\n[Step 1] 전처리 -> S3 raw/, labeled/")
    labeled = stage1_preprocess(sms_id, batch_id, raw_record)
    print(f"  cleaned   : {labeled['text']}")
    print(f"  URL/PHONE : {labeled['url']} / {labeled['phone']}")
    print(f"  keywords  : {labeled['special_keyword_count']}")

    print("\n[Step 2] MySQL blacklist 조회")
    hit = stage2_static_filter(sms_id, labeled)
    print(f"  결과      : {hit if hit else 'MISS'}")

    print("\n[Step 3] 모델 추론 (mock) -> S3 processed/")
    processed = stage3_model_inference(sms_id, batch_id, labeled, hit)
    print(f"  label / score : {processed['label']} / {processed['score']}")
    print(f"  risk_level    : {processed['risk_level']}")

    print("\n[Step 4] LLM reason + (RAG) -> S3 reason/")
    reason = stage4_llm_reason(sms_id, batch_id, processed)
    print(f"  reasoning_method : {reason['reasoning_method']}")
    print(f"  유사 사례 수     : "
          f"{len(reason['rag_similar_cases']) if reason['rag_similar_cases'] else 0}")

    verify(sms_id, reason)


if __name__ == "__main__":
    main()