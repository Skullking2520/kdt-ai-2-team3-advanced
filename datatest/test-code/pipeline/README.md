# 스미싱 파이프라인 통합 테스트

세 저장소(MySQL + S3 + ChromaDB)가 한 흐름으로 연결되는지 검증.

## 설치 위치

너의 `test-code/` 폴더 안에 `pipeline/` 폴더를 통째로 두면 된다.

```
test-code/
├── .env
├── pyproject.toml
├── infra/
│   └── docker-compose.yml
├── tests/
│   ├── test_chroma.py
│   ├── test_mysql.py
│   └── test_s3.py
└── pipeline/                  ← 이 폴더
    ├── __init__.py
    ├── config.py              ← 환경변수 로드
    ├── preprocessor.py        ← 정규식 전처리 + 메타 추출
    ├── s3_io.py               ← S3 입출력 헬퍼
    ├── mysql_io.py            ← MySQL 헬퍼
    ├── vector_io.py           ← ChromaDB 헬퍼
    ├── seed_chroma.py         ← ChromaDB 시드 데이터 적재
    └── integration_test.py    ← 통합 테스트 메인
```

## 사전 준비

1. **MySQL 컨테이너 떠 있어야 함**
   ```bash
   docker compose -f infra/docker-compose.yml ps
   # (healthy) 확인
   ```

2. **`.env` 파일에 AWS 자격증명 설정됨**

3. **의존성 설치됨** (`uv sync`)

## 실행

### 1단계: ChromaDB에 시드 데이터 적재 (최초 1회만)

```bash
uv run python -m pipeline.seed_chroma
```

검증된 스미싱 사례 5건이 `smishing_cases` 컬렉션에 적재된다.

### 2단계: 통합 테스트 실행

```bash
uv run python -m pipeline.integration_test
```

## 흐름

```
입력: "긴급 안내드립니다 본인인증 절차가 필요합니다 확인 바랍니다"
    ↓
[Step 0] UUID 생성, MySQL processing_log 행 INSERT
    ↓
[Step 1] 정규식 전처리
    - S3 raw/      ← 원본 + 메타정보(received_at, source)
    - S3 labeled/  ← 정제본 + URL/전화/금액/키워드 카운트
    - MySQL: current_stage='labeled', s3_path 기록
    ↓
[Step 2] MySQL blacklist 조회
    - URL/전화 IN 절로 매칭
    - 결과: MISS (시드된 패턴이 안 맞음)
    ↓
[Step 3] 모델 추론 (mock score=55)
    - S3 processed/ ← labeled + 추론 결과 누적
    - MySQL: label, score, risk_level 등 갱신
    ↓
[Step 4] LLM reason 생성
    - score 55 → RAG 분기 → ChromaDB 검색
    - LLM reason은 mock 문자열
    - S3 reason/ ← processed + RAG 결과 + reason 누적
    - MySQL: reasoning_method='llm_with_rag' 갱신
    ↓
[Step 5] 검증
    - MySQL에서 UUID로 행 조회 (모든 단계 채워졌나)
    - S3 4개 파일에서 우리 UUID 매칭되나
    - ChromaDB 검색 결과 1개 이상 나왔나
```

## 예상 출력 (요약)

```
입력 SMS: 긴급 안내드립니다 본인인증 절차가 필요합니다 확인 바랍니다

[Step 0] ...
  sms_id   : 550e8400-...
  batch_id : 20260601_153000

[Step 1] ...
  cleaned   : 긴급 안내드립니다 본인인증 절차가 필요합니다 확인 바랍니다
  URL/PHONE : [] / []
  keywords  : 3

[Step 2] ...
  결과      : MISS

[Step 3] ...
  label / score : 1 / 55
  risk_level    : 주의

[Step 4] ...
  reasoning_method : llm_with_rag
  유사 사례 수     : 3

============================================================
검증
============================================================

[MySQL] processing_log.550e8400
  current_stage  : reason
  label / score  : 1 / 55
  risk_level     : 주의
  static_hit     : 0
  reason_method  : llm_with_rag
  s3 paths:
    raw       : s3://...    (line 0)
    labeled   : s3://...    (line 0)
    processed : s3://...    (line 0)
    reason    : s3://...    (line 0)

[S3] 각 단계 파일에서 id 매칭 확인
  raw       : 1 건 / 우리 id 매칭 OK
  labeled   : 1 건 / 우리 id 매칭 OK
  processed : 1 건 / 우리 id 매칭 OK
  reason    : 1 건 / 우리 id 매칭 OK

[ChromaDB] 유사도 검색 결과
  1. [본인인증사칭] 긴급 본인 확인이 필요합니다 즉시 인증해주세요
     similarity=0.8xx
  2. [본인인증사칭] 본인인증 위해 첨부 링크 클릭 바랍니다
     similarity=0.7xx
  3. [결제사칭] 결제 승인 본인 아닐 시 즉시 연락 바람
     similarity=0.5xx

[Reason]
  이 메시지는 '본인인증사칭' 패턴과 유사하며(유사도 0.8xx),
  KISA 신고 사례와 일치하는 특징을 보입니다. [mock reason]

[OK] 통합 테스트 통과
```

## 검증 포인트

- **MySQL**: 한 행에 raw → labeled → processed → reason 누적 갱신됨
- **S3**: 4개 폴더 모두 같은 UUID로 레코드 존재
- **ChromaDB**: 시드 사례 중 유사도 높은 케이스 검색됨

## 자주 만나는 문제

### ModuleNotFoundError: No module named 'pipeline'
프로젝트 루트(`test-code/`)에서 실행해야 한다.
```bash
cd test-code   # 이 위치에서
uv run python -m pipeline.integration_test
```

### NoCredentialsError
`.env` 파일이 로드되지 않음. 루트(`test-code/`)에 `.env` 있는지 확인.

### MySQL Access denied
MySQL 컨테이너가 안 떴거나 비밀번호 다름. `docker compose ps`로 확인.

### Connection refused (MySQL)
컨테이너가 healthy 되기 전. 10~30초 기다린 후 재시도.

### ChromaDB 결과 비어있음
`pipeline/seed_chroma.py` 먼저 실행했는지 확인.

