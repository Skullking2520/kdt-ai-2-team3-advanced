# [문서화] 스미싱 탐지 파이프라인 테스트 환경 구축

## 요약

<!-- 연관 이슈 번호: closes #이슈번호 -->

스미싱 탐지 파이프라인의 3개 저장소(MySQL · S3 · ChromaDB) 연결을 검증하는 테스트 환경을 구축.

- 각 저장소 단위 연결 테스트 (`tests/`)
- 전처리 → 분류 → RAG → 이유 생성까지 이어지는 통합 테스트 (`pipeline/`)
- 로컬 인프라 정의 (`infra/docker-compose.yml`)

---

## 작업 내용

### 폴더 구조

```
test-code/
├── .env                        # AWS 자격증명 + MySQL 설정 (Git 제외)
├── pyproject.toml              # uv 의존성 정의
├── infra/
│   └── docker-compose.yml      # MySQL 컨테이너
├── tests/
│   ├── test_chroma.py          # ChromaDB + ko-sroberta 임베딩 단위 확인
│   ├── test_mysql.py           # MySQL 접속 · CRUD 확인
│   └── test_s3.py              # S3 버킷 업/다운로드 확인
└── pipeline/
    ├── config.py               # 환경변수 로드
    ├── preprocessor.py         # 정규식 전처리 + 메타 추출
    ├── s3_io.py                # S3 입출력 헬퍼
    ├── mysql_io.py             # MySQL 헬퍼
    ├── vector_io.py            # ChromaDB 헬퍼
    ├── seed_chroma.py          # ChromaDB 시드 데이터 5건 적재
    └── integration_test.py     # 전체 파이프라인 통합 테스트
```

### 통합 테스트 흐름

```
SMS 입력
  ↓ [Step 0] UUID 생성, MySQL processing_log INSERT
  ↓ [Step 1] 정규식 전처리 → S3 raw/ · labeled/ 업로드, MySQL 갱신
  ↓ [Step 2] MySQL blacklist IN 절 조회
  ↓ [Step 3] 모델 추론 (mock score) → S3 processed/ 업로드, MySQL 갱신
  ↓ [Step 4] RAG 분기 → ChromaDB 유사도 검색 → S3 reason/ 업로드
  ↓ [Step 5] MySQL · S3 · ChromaDB 결과 검증
```

### 주요 기술 스택

| 구성요소 | 스택 |
|---|---|
| 벡터 DB | ChromaDB (PersistentClient, cosine) |
| 임베딩 모델 | `jhgan/ko-sroberta-multitask` (768차원) |
| RDB | MySQL 8 (Docker) |
| 오브젝트 스토리지 | AWS S3 (`smishing-dev-newbies-2026`) |
| 패키지 관리 | uv (`pyproject.toml`) |

---

## 실제 걸린 시간

<!-- 예: 3시간 -->

---

## 리뷰 요청 사항

- `pipeline/config.py` 기본값(비밀번호 `dev1234`)이 개발 전용인 점 확인 부탁
- `pipeline/integration_test.py` Step 3·4의 mock 값을 실제 모델로 교체하는 방향 의견 주시면 좋겠음
- `infra/docker-compose.yml` 볼륨 설정이 팀 컨벤션과 맞는지 확인 부탁

---

## 작업하며 고민했던 점 (선택)

- **ChromaDB 시드와 통합 테스트 분리**: `seed_chroma.py`를 별도 스크립트로 분리해 최초 1회만 실행하도록 설계. 매번 시드를 재적재하면 중복 오류가 발생해 `get_or_create_collection` 패턴 채택.
- **통합 테스트 mock 범위**: 현 단계에서 실제 KcELECTRA 모델을 연동하면 모델 파일 의존성이 생겨 테스트 재현성이 떨어질 수 있어 Step 3(추론)은 mock score=55로 고정. 이후 실제 연동 시 분리 예정.
- **S3 파일 포맷**: 각 단계가 이전 단계 필드를 누적하는 JSONL 구조로 설계해 재처리 시 이력 추적이 가능하도록 함.

---

## 테스트 실행 여부

👍 **네, 테스트했어요.**

```bash
# 인프라 기동
docker compose -f infra/docker-compose.yml up -d

# 단위 테스트
uv run python tests/test_chroma.py
uv run python tests/test_mysql.py
uv run python tests/test_s3.py

# 통합 테스트
uv run python -m pipeline.seed_chroma
uv run python -m pipeline.integration_test
```

정상 종료 확인: `[OK] 통합 테스트 통과`

---

## 리뷰 참고사항 (선택)

- `.env` 파일은 Git에 올라가지 않음. `.env.save`가 키 목록 참고용으로 존재.
- `chroma_db/`도 Git 제외. `seed_chroma.py` 실행으로 로컬 재생성 가능.
- `tests/` 스크립트는 `pytest` 미사용. 직접 실행하는 확인 스크립트.
- Python 3.10+ 필요 (`pyproject.toml` `requires-python = ">=3.10"`).

---

## 시각 자료 (선택)

<!-- 스크린샷이나 영상이 있으면 여기에 첨부 -->
