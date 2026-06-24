# Smishing 테스트 환경 셋업

> 이 폴더는 데이터 저장소와 벡터 검색을 검증한 실험 환경이다. 현재 서비스 실행과
> Encoder 재학습의 기준은 각각 `backend/README.md`, `encoder_retraining/README.md`다.

ChromaDB + ko-sroberta 임베딩 동작을 확인하기 위한 최소 테스트 환경.
스미싱 탐지 파이프라인의 벡터 검색 부분을 검증한다.

## 무엇이 들어있나

| 파일 | 역할 |
|---|---|
| `test_chroma.py` | ChromaDB + 임베딩 모델 동작 확인 스크립트 |
| `pyproject.toml` | uv용 의존성 정의 (uv 사용 시) |
| `requirements.txt` | pip용 의존성 정의 (pip 사용 시) |
| `README.md` | 이 문서 |


## 사전 요구사항

- **Python 3.10 이상** (3.11 권장)
- **macOS / Linux / WSL** (Windows는 WSL 권장)

### uv 설치 (미설치 시)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 프로젝트 셋업

```bash
# 이 폴더로 이동
cd datatest/test-code

# Python 버전 고정 (선택)
uv python pin 3.11

# 의존성 설치 (pyproject.toml 기반)
uv sync

# 동작 확인
uv run python test_chroma.py
```

처음 실행 시 임베딩 모델 다운로드로 1~3분 걸린다.
이후엔 캐시(`~/.cache/huggingface/`) 사용으로 빠름.

## 2. pip로 시작하기 (uv 안 쓸 때)

```bash
cd datatest/test-code

# 가상환경 생성
python -m venv .venv

# 가상환경 활성화
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows

# 의존성 설치
pip install -r requirements.txt

# 동작 확인
python test_chroma.py
```

## 3. 정상 출력 예시

```
1. 임베딩 모델 로드 중... (처음이면 다운로드, 수백 MB)
   완료. 차원: 768

2. ChromaDB 클라이언트 생성 (PersistentClient → ./chroma_db/)

3. 컬렉션 생성 또는 가져오기 (cosine 거리)

4. 샘플 사례 3건 적재
   적재 완료. 컬렉션 내 총 건수: 3

5. 유사도 검색

   쿼리: 본인 확인이 필요합니다 링크 눌러주세요
   결과 (거리 작을수록 유사):
   - [본인인증사칭] 본인인증 위해 첨부 링크 클릭 바랍니다  (거리: 0.2xx)
   - [택배사칭] 택배 배송 주소가 불일치합니다 확인 바람  (거리: 0.6xx)
   - [당첨사칭] 축하합니다 100만원 당첨 지급 확인하세요  (거리: 0.7xx)

[OK] ChromaDB + ko-sroberta 동작 확인 완료.
```

거리 값이 위와 정확히 같지 않아도 OK. **본인인증사칭이 1위로 나오면 정상.**

## 4. 실행 후 생기는 것

```
datatest/test-code/
├── chroma_db/             # ChromaDB가 자동 생성 (DB 본체)
│   ├── chroma.sqlite3
│   └── ...
├── .venv/                 # 가상환경
├── test_chroma.py
├── pyproject.toml
├── requirements.txt
└── README.md
```

- `chroma_db/`: ChromaDB 데이터. 삭제하면 컬렉션 초기화됨.
- `.venv/`: Python 가상환경. Git에 올리지 말 것.

## 5. 주요 사양

| 항목 | 값 |
|---|---|
| 임베딩 모델 | `jhgan/ko-sroberta-multitask` |
| 벡터 차원 | 768 |
| 거리 측정 | Cosine |
| ChromaDB 모드 | PersistentClient (로컬 파일) |

이 사양은 메인 스미싱 파이프라인 스키마와 동일하다.
파이프라인에서 동일 모델로 임베딩한 데이터는 이 컬렉션과 호환된다.


### macOS에서 SSL 인증서 오류
```bash
/Applications/Python\ 3.11/Install\ Certificates.command
```

## 7. 다음 단계

이 테스트가 통과하면 메인 파이프라인 통합으로 넘어간다:
- MySQL (Docker) 연결
- AWS S3 입출력
- SmsClassifier 모델 추론과 연동
- raw → labeled → processed → reason 흐름 구현

## 추가된 모듈 2026 06 04

### VirusTotal 연동 (`pipeline/virustotal_io.py`)
- URL/도메인 악성 여부 자동 조회
- 일별 할당량 관리 (자동 400회 / 수동 100회)
- 한글 요약 보고서 생성

### APScheduler (`pipeline/scheduler.py`)
- 매일 02:00 KST 자동 VT 스캔
- blacklist 테이블 VT 결과 자동 갱신
- S3 `analytics/virustotal/` 에 배치 결과 저장

## 추가된 모듈 2026 06 05

### DuckDB + Streamlit 모니터링 대시보드 (`pipeline/dashboard.py`)
- S3 데이터 직접 SQL 조회 (DuckDB)
- 파이프라인 처리 현황, VT 조회 결과, 로그 요약, MySQL 현황
- 실행: `uv run streamlit run pipeline/dashboard.py`

### 의존성 추가
- `duckdb==1.2.x`
- `streamlit==1.5.3` (오타아님? 너무 낮은 버전인데)
- `plotly`
