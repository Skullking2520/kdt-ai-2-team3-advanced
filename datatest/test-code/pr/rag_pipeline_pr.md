# [기능] 스미싱 RAG 데이터 자동 수집·정제·벡터화 파이프라인 구축

> 이 문서는 과거 실험 PR의 기록이다. 현재 운영 재학습 흐름은
> `encoder_retraining/README.md`와 `encoder_retraining/automation/README.md`를 기준으로 한다.

## 요약

<!-- 연관 이슈 번호: closes #이슈번호 -->

웹 크롤링으로 수집한 한국 스미싱·피싱 뉴스 기사를 Gemini Flash 멀티모달 모델로 정제해
실제 SMS 문자 원문을 추출, Pinecone 벡터 DB에 적재하는 RAG 데이터 파이프라인을 구축.

- Playwright 크롤러에 이미지 URL 수집 기능 추가 (기사 내 SMS 스크린샷 대응)
- Gemini 2.5 Flash 멀티모달로 본문+이미지에서 SMS 원문 추출, 없으면 자동 SKIP
- 기존 `seed_pinecone.py`와 호환되는 JSONL 포맷으로 출력
- `prepare_dataset.py`에 S3 자동 업로드 추가, 학습 데이터 Git 제외

---

## 작업 내용

### 신규/변경 파일

```
test-code/
├── pyproject.toml                  # [변경] google-genai, readability-lxml, ollama 의존성 추가
└── pipeline/
    ├── web_crawler.py              # [변경] image_urls 컬럼 추가, _collect_images() 함수 추가
    └── web_to_rag.py               # [신규] 크롤링 CSV → Pinecone JSONL 변환

datatest/
└── cleanlab/
    └── prepare_dataset.py          # [변경] 로컬 저장 후 S3 자동 업로드 추가

.gitignore                          # [변경] encoder_retraining/data/, cleanlab/results/ 제외
```

### 1. web_crawler.py - 이미지 URL 수집 추가

기사 상세 페이지 방문 시 본문 영역 `img` src를 수집해 `image_urls` 컬럼에 저장.
SMS 스크린샷이 텍스트 없이 이미지로만 게시된 경우(경찰청 게시판 등) 대응.

```
CSV 스키마 변경:
  기존: id, source, url, title, date, crawled_date, content, crawled_at
  변경: id, source, url, title, date, crawled_date, content, image_urls, crawled_at
```

### 2. web_to_rag.py - Gemini 멀티모달 SMS 추출 파이프라인 (신규)

| 단계 | 내용 |
|------|------|
| S3 배치 CSV 로드 | `crawled/web/batch*.csv` 전체 또는 특정 배치 |
| 텍스트+이미지 전달 | 이미지 URL 있으면 Gemini에 함께 전달 |
| SMS 추출 판단 | 피해자 수신 맥락 명확 + 완성된 문장인 경우만 추출 |
| 이미지 실패 fallback | 이미지 로드 실패 시 텍스트 전용으로 재시도 |
| SKIP 처리 | 실제 SMS 인용 없으면 해당 기사 제외 (창작 금지) |
| JSONL 출력 | `seed_pinecone.py` 호환 스키마로 저장 |

**추출 조건 (모두 충족 필요):**
- 기사 본문 또는 이미지에 문자 메시지 직접 인용
- 피해자 수신 맥락 명확 ("~라는 문자를 받았다" 등)
- 기사 제목·소제목·요약 문구 아닐 것
- 완성된 문장 (단어 조각 아님)

**사이트 → security_type 매핑:**

| 사이트 | security_type |
|--------|--------------|
| sokjima | 스미싱 |
| kisa | 스미싱 |
| police | 피싱 |
| msafer | 피싱 |
| wiseuser | 보이스피싱 |

### 3. prepare_dataset.py - S3 자동 업로드

Cleanlab 정제 데이터셋 로컬 저장 후 S3에 자동 업로드.
Git에는 학습 데이터 파일 미포함.

```
S3 저장 경로:
  encoder_retraining/{dataset_version}/
    ├── cleaned_train.jsonl
    ├── valid.jsonl
    ├── test.jsonl
    └── manifest.json
```

### 전체 데이터 흐름

```
웹 크롤링 (web_crawler.py)
  ↓ batch*.csv (본문 + 이미지 URL)
  S3: crawled/web/batch{N}.csv

Gemini 정제 (web_to_rag.py)
  ↓ 본문/이미지에서 실제 SMS 원문 추출
  ↓ SKIP: 인용 SMS 없는 기사 제외
  로컬: web_rag.jsonl

Pinecone 적재 (seed_pinecone.py)
  ↓ ko-sroberta 임베딩 → Pinecone upsert
  Pinecone: smishing-cases-v01
```

---

## 실제 걸린 시간

<!-- 예: 4시간 -->

---

## 리뷰 요청 사항

- `_collect_images()`: `article`, `.content`, `#content`, `main` 등 범용 셀렉터 사용 중. 사이트별 최적화 여지 있음
- SKIP 비율이 약 75% (기사 대부분 SMS 직접 인용 없음). 데이터 양 늘리려면 크롤링 소스 확대 검토 필요
- `prepare_dataset.py` S3 업로드 실패 시 로컬 파일은 저장되나 예외만 출력. 재시도 로직 추가 여부 의견 주시면 좋겠음

---

## 작업하며 고민했던 점 (선택)

- **이미지 URL 방식 선택**: 이미지를 직접 다운로드해 base64로 전달하는 방식 대신 공개 URL을 Gemini에 직접 넘기는 방식 채택. 저장 용량 절감, 단 일부 사이트 CORS 제한으로 Gemini 로드 실패 시 텍스트 전용으로 fallback 처리.
- **창작 금지 정책**: 초기 구현은 SMS 재현(증강)을 허용했으나 학습 데이터 품질 저하 우려로 실제 인용이 확인된 경우만 추출하도록 변경. SKIP 비율이 높아졌으나 데이터 신뢰성 확보 우선.
- **Gemini 모델 선택**: 무료 티어 미지원(한국 지역), 선불 크레딧 방식. 181건 기준 비용 약 $0.05.

---

## 테스트 실행 여부

👍 **네, 테스트했어요.**

```bash
# 의존성 설치
uv sync

# 크롤링 (이미지 URL 포함)
uv run python -m pipeline.web_crawler

# RAG 정제 (특정 배치만)
uv run python -m pipeline.web_to_rag --batch batch4.csv --out web_rag.jsonl

# 파싱만 확인 (API 호출 없음)
uv run python -m pipeline.web_to_rag --dry-run --batch batch4.csv

# Pinecone 적재
uv run python -m pipeline.seed_pinecone web_rag.jsonl
```

실행 결과 (batch4.csv, 100건 기준):
```
본문 있음: 93건
SKIP (SMS 인용 없음): 61건
이미지 fallback 포함 추출: ~10건
오류: ~0건 (fallback 적용 후)
```

---

## 리뷰 참고사항 (선택)

- `GEMINI_API_KEY` `.env`에 추가 필요
- 기존 batch1~3은 `image_urls` 컬럼 없음 (이전 크롤링 결과). batch4부터 이미지 포함
- `web_to_rag.py`는 `--batch` 옵션으로 특정 배치만 처리 가능
- Gemini 없이 테스트: `--dry-run` 플래그 사용

---

## 시각 자료 (선택)

<!-- 스크린샷이나 영상이 있으면 여기에 첨부 -->
