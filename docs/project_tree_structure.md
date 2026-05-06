my-ai-app/ # 프로젝트 루트
├── pyproject.toml # [1] 전체 workspace 설정 (uv.lock 관리)
├── uv.lock # [2] 통합 lock 파일 (전체 의존성 고정)
├── README.md
├── .python-version
├── .gitignore
│
├── apps/ # 실행 가능한 애플리케이션
│ ├── backend/ # FastAPI, Django 등
│ │ ├── src/
│ │ └── pyproject.toml # BE 전용 의존성
│ ├── frontend/ # React, Next.js, Vue 등 (Node 기반일 경우)
│ │ └── package.json
│ └── ai_service/ # AI 추론/서빙 서비스
│ ├── src/
│ └── pyproject.toml # AI 전용 의존성 (torch, transformers 등)
│
├── packages/ # 공통 라이브러리 및 내부 모듈
│ ├── database/ # DB 스키마, 모델 공유
│ │ └── pyproject.toml
│ └── core_utils/ # 공통 유틸리티 (로깅, 설정 등)
│ └── pyproject.toml
│
└── notebooks/ # 데이터 분석 및 모델 실험용
└── model_training.ipynb
