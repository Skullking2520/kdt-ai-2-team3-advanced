# 스미싱 탐지 파이프라인 — 데모 가이드

## 실행 전 준비

```bash
# test-code/ 루트에서 실행
cd /path/to/test-code

# .env 파일 확인 (API 키 세팅)
cat .env
```

필요한 환경변수 전체 목록 → [`config.py`](config.py) 참고

---

## 기능 목록

### 01. URL 크롤러
```bash
uv run python demo/01_url_crawler/run.py
```
- **OpenPhish** + **URLhaus** 에서 피싱·악성 URL 자동 수집
- MySQL `blacklist` 테이블에 INSERT IGNORE (중복 자동 스킵)
- 실행 시 수집 미리보기 후 DB 저장 여부 확인

---

### 02. 웹 크롤러 (Playwright)
```bash
uv run python demo/02_web_crawler/run.py
```
- Playwright로 한국 스미싱 관련 게시판 5개 크롤링
  | 사이트 | URL |
  |--------|-----|
  | sokjima | sokjima.com/cases/ |
  | msafer | msafer.or.kr/board_phishing/ |
  | wiseuser | wiseuser.go.kr/edu_list.do |
  | police | cyberbureau.police.go.kr |
  | kisa | boho.or.kr |
- 결과: S3 `crawled/web/batch{N}.csv` (100건씩 분할 저장)
- 실행 시 사이트 선택 가능 (빠른 데모: sokjima 또는 kisa만)

---

### 03. VirusTotal 조회
```bash
uv run python demo/03_virustotal/run.py
```
- URL 또는 도메인 단건 VirusTotal 조회
- 한글 요약 출력 (위험등급, 탐지 엔진 수, 최초 등록일)
- 결과 S3 저장 + MySQL `blacklist` 갱신
- 일일 할당량 표시 (무료 플랜: 자동 400회 / 수동 100회, 분당 4회)

---

### 04. VectorDB — Pinecone
```bash
uv run python demo/04_vector_db/run.py
```
- 임베딩 모델: `jhgan/ko-sroberta-multitask` (768차원, cosine)
- 샘플 스미싱 사례 2건 Pinecone 적재
- 한국어 텍스트로 유사 사례 검색 (코사인 유사도)
- 메타데이터 필터 검색 (`has_url`, `has_phone` 등)

---

### 05. Web→RAG 파이프라인
```bash
uv run python demo/05_web_to_rag/run.py
```
- S3 `crawled/web/batch*.csv` → **Gemini 2.5 Flash** 로 SMS 문자 생성 (기사 기반 데이터 증강)
- 생성된 SMS JSONL 저장 → Pinecone 업로드
- 모드 선택:
  - `dry-run`: API 호출 없이 파싱만 확인 (빠름)
  - 실제 실행: S3 + Gemini + Pinecone 전체
  - 특정 배치만: `batch1.csv` 등 지정 가능

---

### 06. 자동화 스케줄러
```bash
uv run python demo/06_scheduler/run.py
```
APScheduler 기반 자동 파이프라인 (Ctrl+C 종료)

| 시각 (KST) | 작업 |
|-----------|------|
| 00:00 | URL 크롤링 (OpenPhish + URLhaus → blacklist) |
| 00:15 | 웹 크롤링 (Playwright / 게시판 5개 → S3) |
| 00:30 | S3 수동 입력 처리 (`manual_input/*.txt` → blacklist) |
| 02:00 | VirusTotal 자동 스캔 (최대 400건) |

수동 URL 추가:
```bash
# CLI
uv run python -c "from pipeline.crawler import insert_from_file; insert_from_file('urls.txt')"

# S3 업로드 → 00:30에 자동 처리
# s3://smishing-s3-bucket/manual_input/urls_YYYYMMDD.txt
```

---

### 07. 모니터링 대시보드
```bash
uv run streamlit run demo/07_dashboard/run.py
```
Streamlit + DuckDB 기반 실시간 모니터링 (http://localhost:8501)

| 섹션 | 내용 |
|------|------|
| 파이프라인 현황 | raw / labeled / processed / reason 처리 건수 |
| 일별 SMS 처리량 | 라인 차트 |
| RAG 사용 비율 | llm_with_rag / llm_only / skipped_blacklist |
| VectorDB | ChromaDB 카테고리별 사례 수 |
| VirusTotal | 위험등급 분포, 탐지 엔진 수 히스토그램 |
| MySQL | blacklist 건수, VT 할당량, 단계별 현황 |
| 로그 | 최근 오류 10건 |

---

## 수동 실행 순서 (파이프라인 직접 실행)

> 스케줄러 없이 수동으로 전체 파이프라인을 돌릴 때 이 순서대로 실행.

### Step 1. 웹 크롤링

```bash
# 전체 사이트 (sokjima / msafer / wiseuser / police / kisa)
uv run python -m pipeline.web_crawler

# 특정 사이트만
uv run python -c "from pipeline.web_crawler import run_all_web_crawlers; run_all_web_crawlers(sites=['kisa'])"
```

결과: `s3://smishing-s3-bucket/crawled/web/batch{N}.csv`

---

### Step 2. SMS 생성 + Pinecone 업로드

```bash
# 전체 배치 처리 (S3 batch*.csv 전부)
uv run python -m pipeline.web_to_rag

# 새 배치만 처리
uv run python -m pipeline.web_to_rag --batch batch5.csv

# API 호출 없이 파싱만 확인 (dry-run)
uv run python -m pipeline.web_to_rag --dry-run

# JSONL만 저장, Pinecone 업로드 생략
uv run python -m pipeline.web_to_rag --skip-upload

# 출력 파일 지정
uv run python -m pipeline.web_to_rag --out output/web_rag_v4.jsonl
```

---

### Step 3. URL 크롤링 → blacklist 저장

```bash
# OpenPhish + URLhaus 전체
uv run python -m pipeline.crawler

# 파일에서 수동 URL 추가
uv run python -c "from pipeline.crawler import insert_from_file; insert_from_file('urls.txt')"
```

---

### Step 4. VirusTotal 스캔 (blacklist 미처리 항목)

```bash
# 스케줄러 VT job 단독 실행
uv run python -c "from pipeline.scheduler import job_vt_auto_scan; job_vt_auto_scan()"

# 단건 조회 (수동)
uv run python -c "
from pipeline.virustotal_io import process_vt_result
result = process_vt_result('url', 'http://example-phishing.com', mode='manual')
print(result)
"
```

---

### Step 5. 대시보드로 결과 확인

```bash
uv run streamlit run demo/07_dashboard/run.py
```

---

## 데이터 흐름

```
OpenPhish / URLhaus
        ↓
  [01] URL 크롤러 → MySQL blacklist
        ↓
  [03] VT 자동 스캔 → S3 analytics/virustotal/

한국 스미싱 게시판 5개
        ↓
  [02] 웹 크롤러 → S3 crawled/web/batch*.csv
        ↓
  [05] Web→RAG → Gemini SMS 생성 → Pinecone
        ↓
  [04] VectorDB 검색 (RAG 활용)

  [06] 스케줄러 → 01~03 자동화
  [07] 대시보드 → 전체 현황 시각화
```
