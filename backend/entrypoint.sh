#!/bin/bash
set -e
# 실행 중인 명령어 중 하나라도 실패(에러 발생)하면 스크립트 실행을 즉시 중단하라는 옵션

# EC2 인스턴스가 켜지며 컨테이너가 가동될 때 최초 1회 실행됩니다.
# AWS EC2(t3.medium 이상 추천)의 실제 x86_64 CPU 환경에서는 AVX 명령어가 정상 작동하므로 오류 없이 다운로드됩니다.
# CLOVA 전용 모드(USE_CLOVA_ONLY=true)에서는 PaddleOCR을 사용하지 않으므로 초기화를 스킵합니다.
if [ "${USE_CLOVA_ONLY}" = "true" ]; then
    echo "⏭️  [Runtime] CLOVA 전용 모드 — PaddleOCR 초기화 스킵"
else
    echo "📥 [Runtime] AWS EC2 환경에서 PaddleOCR 한국어 모델 최초 초기화를 진행합니다..."
    python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='korean', use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)"
fi

echo "🚀 FastAPI 서버 구동을 시작합니다 (Port: 8000)"
exec uvicorn src.backend.main:app --host 0.0.0.0 --port 8000
