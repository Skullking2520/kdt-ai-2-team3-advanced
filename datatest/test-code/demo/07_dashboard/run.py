"""데모 07 — 모니터링 대시보드 (Streamlit)

시각화 항목:
    파이프라인  : raw / labeled / processed / reason 처리 건수
    일별 차트   : SMS 처리량 라인 차트
    RAG 비율    : llm_with_rag / llm_only / skipped_blacklist 파이 차트
    위험등급    : 위험 높음 / 주의 / 정상 가능성 높음 바 차트
    VectorDB    : ChromaDB 카테고리별 사례 수
    VT 현황     : 위험등급 분포, 탐지 엔진 수 히스토그램
    MySQL       : blacklist 건수, VT 할당량, processing_log 단계별 현황
    로그        : 최근 오류 10건

실행:
    cd /path/to/test-code
    uv run streamlit run demo/07_dashboard/run.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from pipeline.Dashboard import main

main()
