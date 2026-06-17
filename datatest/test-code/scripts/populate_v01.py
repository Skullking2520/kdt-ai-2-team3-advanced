"""v0.1 초기 데이터 적재 스크립트.

적재 내용:
- ragas 노트북의 SMISHING_DOCUMENTS 6건 (도메인 분석 문서)
- 스키마 예시 SMS 사례 5건 (KISA 실제 사례 기반)

실행:
    PINECONE_API_KEY=... python -m scripts.populate_v01
"""
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'pipeline'))
from datetime import datetime, timezone
from pipeline.vector_io import upsert_cases
from pipeline.meta_builder import build_case_metadata


# ─── 공통 메타 필드 ────────────────────────────────────────────────
NOW = datetime.now(timezone.utc)
DOC_VERSION = "v2.1"
PIPELINE_VERSION = "p-0.4.0"


# ─── 데이터 1: ragas 골든 문서 (6건) ─────────────────────────────
# 원문은 ai_monitoring/notebook의 SMISHING_DOCUMENTS와 동일.
# 여기서는 검색·임베딩 검증용으로 텍스트만 포함.
RAGAS_DOCUMENTS = [
    {
        "id": "case_ragas_2026_001",
        "document": (
            "스미싱(Smishing)에서 활용되는 심리적 트리거 분석. "
            "스미싱은 SMS와 피싱(Phishing)의 합성어로, 문자 메시지를 매개체로 활용하는 "
            "사회공학(Social Engineering) 공격이다. 범죄심리학적 관점에서 스미싱 공격자는 "
            "긴급성 편향, 권위 편향, 희소성 편향, 사회적 증거, 친밀감 유발 등의 "
            "인지 편향을 이용한다."
        ),
        "ground_truth": "스미싱 심리적 트리거 5종: 긴급성·권위·희소성·사회적증거·친밀감",
    },
    {
        "id": "case_ragas_2026_002",
        "document": (
            "신종 스미싱 기법 분류 및 사례 (2023-2025). "
            "보이스피싱 연계형 멀티채널 스미싱, QR코드 스미싱(Quishing), 딥페이크 연계 스미싱, "
            "세금·환급 사기형, 패키지 배송 사칭형, 구독 해지 유도형 등이 대표적이다."
        ),
        "ground_truth": "2023-2025 신종 스미싱 6종 분류",
    },
    {
        "id": "case_ragas_2026_003",
        "document": (
            "스미싱 텍스트에서 나타나는 사회공학적 언어 패턴 분석. "
            "위협-구제 프레임, 모호한 개인화, 마찰 제거, 합법성 신호 모방, "
            "시간 제한 설정 등의 언어 패턴이 관찰된다."
        ),
        "ground_truth": "스미싱 텍스트 사회공학 패턴 5가지",
    },
    {
        "id": "case_ragas_2026_004",
        "document": (
            "스미싱 탐지 시스템의 기술적 접근 방법론. "
            "규칙 기반 탐지, 머신러닝 기반 탐지, 딥러닝(BERT/KoBERT) 기반 탐지, "
            "대조 학습 및 Few-shot 탐지, RAG 기반 설명 가능한 탐지 등이 있다."
        ),
        "ground_truth": "스미싱 탐지 기술 5가지 접근법",
    },
    {
        "id": "case_ragas_2026_005",
        "document": (
            "실제 스미싱 문자 사례 및 분석 (KISA 신고 기반). "
            "공공기관 사칭 + 과태료 결제, 건강보험 환급 사기, 가족 사칭 긴급 자금 요청, "
            "앱 업데이트 위장 악성코드, 정부 지원금 사기 등 다양한 실제 사례가 보고된다."
        ),
        "ground_truth": "KISA 신고 기반 5대 스미싱 사례 유형",
    },
    {
        "id": "case_ragas_2026_006",
        "document": (
            "스미싱 피해자 심리 프로파일 및 취약 집단 분석. "
            "고령층(65세 이상), 청년층 과부하 상태, 금융 취약 집단이 주요 취약 집단이다. "
            "피해 단계는 접촉-주의-평가-행동-인지의 5단계 모델로 설명된다."
        ),
        "ground_truth": "취약 집단 3종 + 피해 단계 5단계 모델",
    },
]


# ─── 데이터 2: 스키마 예시 SMS 사례 (5건) ─────────────────────────
# KISA 신고 사례를 기반으로 한 실제 SMS 본문 예시.
# 각 사례는 추출 가능한 엔티티(URL, 전화, 금액, 계좌)를 포함.
EXAMPLE_CASES = [
    {
        "id": "case_example_2026_001",
        "document": (
            "[교통범칙금 안내] 귀하의 차량(12가3456)이 2026-03-15 속도위반으로 "
            "적발되었습니다. 미납 시 면허 정지 조치됩니다. "
            "납부: http://fine-pay.top"
        ),
        "ground_truth": "공공기관 사칭 + 차량 개인화 + 위협-구제 프레임",
        "has_url": 1, "has_phone": 0, "has_money": 0, "has_account": 0,
        "special_keyword_count": 3,  # 미납·정지·납부
    },
    {
        "id": "case_example_2026_002",
        "document": (
            "[국민건강보험공단] 2026년 건강보험료 과납분 87,600원 환급 대상입니다. "
            "7일 내 신청하지 않으면 소멸됩니다. "
            "신청: http://nhis-refund.net/req"
        ),
        "ground_truth": "공공기관 사칭 + 소액 환급 + 인위적 마감기한",
        "has_url": 1, "has_phone": 0, "has_money": 1, "has_account": 0,
        "special_keyword_count": 4,  # 환급·소멸·신청·기한
    },
    {
        "id": "case_example_2026_003",
        "document": (
            "엄마 나 핸드폰 고장났어. 친구 폰 빌렸어. 급하게 30만원만 보내줘. "
            "계좌: 신한 110-123-456789 (홍길동). 나중에 꼭 갚을게"
        ),
        "ground_truth": "가족 사칭 + 정서적 사회공학 + 검증 불가 조건",
        "has_url": 0, "has_phone": 0, "has_money": 1, "has_account": 1,
        "special_keyword_count": 2,  # 급하게·보내줘
    },
    {
        "id": "case_example_2026_004",
        "document": (
            "[카카오뱅크] 보안 강화를 위해 최신 버전 업데이트가 필요합니다. "
            "업데이트 후 재로그인 해주세요: http://kakaobnk-secure.com/apk"
        ),
        "ground_truth": "악성 APK 사이드로딩 유도 + 금융사 사칭",
        "has_url": 1, "has_phone": 0, "has_money": 0, "has_account": 0,
        "special_keyword_count": 3,  # 보안·업데이트·재로그인
    },
    {
        "id": "case_example_2026_005",
        "document": (
            "[고용노동부] 청년 취업 지원금 300만원 수령 대상으로 선정되었습니다. "
            "신청 마감: 2026-04-30. 본인 확인 후 즉시 지급: http://moel-youth.kr"
        ),
        "ground_truth": "정부 지원금 사기 + 고액 미끼 + 시간 제한",
        "has_url": 1, "has_phone": 0, "has_money": 1, "has_account": 0,
        "special_keyword_count": 4,  # 지원금·선정·마감·즉시
    },
]


# ─── 메타 빌드 ──────────────────────────────────────────────────
def build_ragas_meta(doc: dict) -> dict:
    """ragas 골든 문서용 메타. 추출 플래그는 0으로 (분석 문서이므로)."""
    return build_case_metadata(
        source="ragas_golden",
        security_type="analysis",
        language="ko",
        original_doc_id=doc["id"],
        doc_version=DOC_VERSION,
        pipeline_version=PIPELINE_VERSION,
        collected_at=NOW,
        updated_at=NOW,
        has_url=0,
        has_phone=0,
        has_money=0,
        has_account=0,
        special_keyword_count=0,
        ground_truth=doc.get("ground_truth"),
    )


def build_example_meta(doc: dict) -> dict:
    """스키마 예시 SMS 사례용 메타."""
    return build_case_metadata(
        source="train_data",
        security_type="스미싱",
        language="ko",
        original_doc_id=doc["id"],
        doc_version=DOC_VERSION,
        pipeline_version=PIPELINE_VERSION,
        collected_at=NOW,
        updated_at=NOW,
        has_url=doc["has_url"],
        has_phone=doc["has_phone"],
        has_money=doc["has_money"],
        has_account=doc["has_account"],
        special_keyword_count=doc["special_keyword_count"],
        ground_truth=doc.get("ground_truth"),
    )


# ─── 메인 ──────────────────────────────────────────────────────
def main():
    print("=== v0.1 적재 시작 ===")

    ids, docs, metas = [], [], []

    # ragas 골든 6건
    for d in RAGAS_DOCUMENTS:
        ids.append(d["id"])
        docs.append(d["document"])
        metas.append(build_ragas_meta(d))

    # 예시 사례 5건
    for d in EXAMPLE_CASES:
        ids.append(d["id"])
        docs.append(d["document"])
        metas.append(build_example_meta(d))

    print(f"적재 대상: {len(ids)}건")
    print(f"  - ragas_golden: {len(RAGAS_DOCUMENTS)}건")
    print(f"  - train_data:   {len(EXAMPLE_CASES)}건")

    # Pinecone 적재
    upsert_cases(ids=ids, documents=docs, metadatas=metas)

    print("=== 적재 완료 ===")

    # 간단한 검증: 적재된 데이터로 샘플 검색
    print("\n=== 검증 검색 ===")
    from pipeline.vector_io import search_similar

    test_queries = [
        "건강보험 환급금이라며 링크 클릭 유도",
        "가족 사칭 송금 요청",
        "스미싱 심리적 트리거",
    ]
    for q in test_queries:
        print(f"\nQ: {q}")
        results = search_similar(q, n_results=2)
        for r in results:
            print(
                f"  - [{r['similarity']:.3f}] {r['case_id']}: "
                f"{r['document'][:60]}..."
            )


if __name__ == "__main__":
    main()
