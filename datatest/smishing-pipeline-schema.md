# 스미싱 탐지 파이프라인 스키마 정의

> 이 문서는 S3·MySQL·Vector DB를 함께 사용하는 장기 데이터 플랫폼의 **목표 설계**다.
> 현재 웹 서비스 런타임은 FastAPI backend와 MySQL 중심으로 동작하며, 이 문서의
> `processing_log`, DuckDB, S3 단계별 경로가 모두 구현된 것은 아니다.

## 0. 한눈에 보기

```
[SMS 입력]
   │
   ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 1: 전처리 (정규식)                                   │
│   • S3 raw/        ← 원본 보존                             │
│   • S3 labeled/    ← 정제본 + 메타 추출 (URL, 전화 등)     │
└─────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 2: 정적 필터링 (MySQL blacklist 조회)                │
│   • HIT  → label=1 즉시 확정, Stage 3/4 건너뜀             │
│   • MISS → Stage 3으로                                    │
└─────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 3: 모델 추론 (SmsClassifier)                         │
│   • S3 processed/  ← score(0~100), label, risk_level      │
└─────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 4: LLM 추론                                          │
│   • score 40~70 (애매한 케이스) → Vector DB 유사도 + LLM   │
│   • 그 외 → LLM만                                         │
│   • S3 reason/  ← 최종 결과 (reasoning_method로 구분)      │
└─────────────────────────────────────────────────────────┘

병행: MySQL processing_log 테이블에 단계별 상태/결과 기록
```

---

## 1. 저장소 역할 분담

| 저장소 | 역할 | 저장 대상 |
|---|---|---|
| **S3** (`smishing-dev-newbies-2026`) | 파일 저장소 | 단계별 JSONL 파일, 원본 보관, 이미지 |
| **MySQL** | 빠른 검색/조회 (OLTP) | 블랙리스트, 처리 이력, SMS 메타, 검수 라벨 |
| **ChromaDB** | 유사도 검색 | 스미싱 사례 임베딩 (Stage 4 RAG용) |
| **DuckDB** | 분석 (OLAP, 읽기 전용) | 자기 저장 없음 — S3/MySQL을 읽어 집계 |

**원칙**: 큰 파일은 S3, 빠른 검색은 MySQL, 의미 기반 유사도는 ChromaDB, 분석/집계는 DuckDB.

---

## 1-1. 작업별 데이터 흐름 매트릭스

각 작업이 어떤 저장소를 사용하는지 한눈에 보기.

| 작업 | MySQL | S3 | ChromaDB | DuckDB |
|---|---|---|---|---|
| 최신 피해 사례 크롤링 (URL/전화/HTML) | URL·전화 → `blacklist` | HTML 덤프 → `raw/` | — | — |
| 사용자 신고 SMS | 메타 → `sms_records` (또는 `processing_log`) | 캡처 이미지 → `images/` | — | — |
| 정적 패턴 DB 운영 | `blacklist` 관리 (CRUD) | — | — | — |
| Stage 1 전처리 | 핵심 필드 → `processing_log` | `raw/`, `labeled/` 저장 | — | — |
| Stage 3 모델 추론 | `score`, `label` → `processing_log` | `processed/` 저장 | — | — |
| Stage 4 LLM 추론 | `reasoning_method` → `processing_log` | `reason/` 저장 | (애매 케이스 시 조회) | — |
| Vector DB 구축 | — | 원본 사례 → `raw/`, `vectordb_source/` | 임베딩 저장 (`smishing_cases`) | — |
| 데이터셋 버전 관리 | — | `exports/v0.X/*.jsonl` (DVC/WandB 포인터) | — | — |
| 데이터 검수 (Cleanlab 결과) | 의심 라벨 → `label_audit` | — | — | — |
| 모니터링 / 대시보드 | (조회만) | (조회만) | — | **분석 쿼리 실행** |
| 학습 데이터 슬라이싱 | — | 결과 → `analytics/` Parquet | — | 슬라이싱 쿼리 |

**읽는 법**:
- 각 셀은 "이 작업이 이 저장소에 **무엇을 쓰거나 어떻게 사용하는지**"
- 빈 칸(—)은 해당 저장소를 사용하지 않음
- "(조회만)"은 쓰지 않고 읽기만 함

---

## 2. S3 폴더 구조

**버킷**: `s3://smishing-dev-newbies-2026/`
**리전**: `ap-northeast-2`

```
s3://smishing-dev-newbies-2026/
│
├── raw/                          # Stage 1 입력: 원본 SMS (배치)
│   └── YYYY/MM/DD/batch_{YYYYMMDD_HHMMSS}.jsonl
│
├── labeled/                      # Stage 1 출력: 정제 + 메타
│   └── YYYY/MM/DD/batch_{YYYYMMDD_HHMMSS}.jsonl
│
├── processed/                    # Stage 3 출력: 모델 추론
│   └── YYYY/MM/DD/batch_{YYYYMMDD_HHMMSS}.jsonl
│
├── reason/                       # Stage 4 출력: 최종 (LLM reason 포함)
│   └── YYYY/MM/DD/batch_{YYYYMMDD_HHMMSS}.jsonl
│
├── images/                       # 사용자가 신고 시 첨부한 SMS 캡처
│   └── YYYY/MM/DD/{sms_id}.{png|jpg}
│
├── vectordb_source/              # ChromaDB 임베딩 원본 사례
│   └── {source}/{doc_id}.json
│
├── exports/                      # 데이터셋 버전 관리용 (DVC/WandB가 가리킴)
│   └── v0.X/
│       ├── train.jsonl
│       ├── eval.jsonl
│       └── meta.yaml
│
└── analytics/                    # DuckDB 분석 결과 캐시 (선택)
    ├── daily_stats/YYYY/MM/DD.parquet
    └── monthly_dump/YYYY/MM/full.parquet
```

### 배치 단위 저장 정책

**SMS 1건 = S3 파일 1개가 아니다.** 여러 건을 하나의 JSONL 파일로 묶어 저장한다.
이유: S3 PUT 요청 비용, 작은 파일 다수로 인한 분석 성능 저하 (small-file problem).

| 데이터 출처 | 배치 묶음 단위 |
|---|---|
| 사용자 실시간 입력 | 5~10분마다 flush 또는 1000건 누적 시 flush |
| 크롤링 피드 (피싱 URL 등) | 크롤링 사이클당 1파일 |
| 배치 학습 데이터 | 원본 그대로 자연스러운 단위 |

**파일 크기 목표**: 수십 MB ~ 수백 MB (DuckDB가 가장 효율적으로 처리하는 범위).

**플러시 전 데이터는 어디에?**
- 사용자 입력은 즉시 MySQL `processing_log`에 기록 (응답 보장)
- S3 업로드까지의 임시 버퍼: Redis 또는 메모리 큐 (운영 시 정책 결정)

### 폴더 운영 규칙

- **`raw/`는 불변**: 절대 수정/삭제하지 않음. 재처리 시 원본으로 사용.
- **날짜 파티셔닝**: `YYYY/MM/DD/` 형태로 분리하여 DuckDB 분석 및 보존 기간 관리 용이.
- **누적 포맷**: 다음 단계 파일은 이전 단계의 필드를 **모두 포함**한다 (재조회 비용 절감).
- **레코드 ID**: 각 JSONL의 한 줄(레코드)마다 UUID4를 가진다. `id`로 단계 간 추적.
- **레코드 위치 추적**: MySQL에서 `s3_raw_path` + `line_no`로 정확한 위치 표기.

---

## 3. 단계별 JSON 스키마

### Stage 1-A: `raw/{id}.jsonl` (원본)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "[WEB발신] 택배 배송 주소 불일치. 확인 바람 http://fake-delivery.kr",
  "received_at": "2026-05-29T15:30:00+09:00",
  "source": "user_input"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string (UUID4) | 파이프라인 전체에서 사용하는 고유 ID |
| `text` | string | 원본 SMS 본문 |
| `received_at` | ISO8601 | 수신 시각 (KST) |
| `source` | string | 출처 (`user_input`, `crawler`, `feed` 등) |

### Stage 1-B: `labeled/{id}.jsonl` (전처리 + 메타)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source_text": "[WEB발신] 택배 배송 주소 불일치. 확인 바람 http://fake-delivery.kr",
  "text": "택배 배송 주소 불일치. 확인 바람 <URL>",
  "received_at": "2026-05-29T15:30:00+09:00",
  "source": "user_input",

  "from_web": 1,
  "from_foreign": 0,
  "has_url": 1,
  "url": ["http://fake-delivery.kr"],
  "has_phone": 0,
  "phone": [],
  "has_money": 0,
  "money": [],
  "special_keyword_count": 3
}
```

| 추가 필드 | 타입 | 설명 |
|---|---|---|
| `source_text` | string | 원본 보존 (`raw`의 `text`) |
| `text` | string | 모델 입력용 정제본 (`<URL>`, `<PHONE>` 등 토큰화) |
| `from_web` | 0/1 | `[WEB발신]` 표시 여부 |
| `from_foreign` | 0/1 | `[국외/국제발신]` 표시 여부 |
| `has_url` / `url` | 0/1, list | URL 포함 여부 / 추출된 URL 리스트 |
| `has_phone` / `phone` | 0/1, list | 전화번호 |
| `has_money` / `money` | 0/1, list | 금액 표현 |
| `special_keyword_count` | int | `keywords.json` 키워드 매칭 개수 |

### Stage 3: `processed/{id}.jsonl` (모델 추론)

```json
{
  "id": "...",
  "source_text": "...",
  "text": "...",
  // ... labeled의 모든 필드 포함 ...

  "static_filter_hit": false,
  "matched_blacklist_id": null,
  "matched_pattern_type": null,
  "matched_pattern_value": null,

  "label": 1,
  "label_name": "스미싱",
  "score": 85,
  "risk_level": "위험 높음",
  "prob_1_risk": 0.85,
  "prob_0_normal": 0.15,
  "features": "url=1, phone=0, money=0, kw=3",

  "model_version": "final_model_v1.0",
  "processed_at": "2026-05-29T15:30:02+09:00"
}
```

| 추가 필드 | 타입 | 설명 |
|---|---|---|
| `static_filter_hit` | bool | Stage 2 블랙리스트 매칭 여부 |
| `matched_blacklist_id` | int / null | MySQL `blacklist.id` |
| `matched_pattern_type` | string / null | `url` / `phone` / `domain` |
| `matched_pattern_value` | string / null | 매칭된 패턴 값 |
| `label` | 0/1 | 모델 예측 (블랙리스트 hit 시 1 고정) |
| `label_name` | string | `스미싱` / `정상` |
| `score` | int (0~100) | 의심 점수 |
| `risk_level` | string | `위험 높음` (≥70) / `주의` (40~69) / `정상 가능성 높음` (<40) |
| `prob_1_risk` | float | 스미싱 확률 (0~1) |
| `prob_0_normal` | float | 정상 확률 (0~1) |
| `features` | string | 디버그/설명용 특징 요약 |
| `model_version` | string | 사용된 모델 버전 |
| `processed_at` | ISO8601 | 모델 처리 시각 |

**정적 필터링 hit 케이스**: `score = 100`, `label = 1`, `model_version = "blacklist"` 로 표시하고 Stage 4로 바로 진행.

### Stage 4: `reason/{id}.jsonl` (최종 결과)

```json
{
  "id": "...",
  // ... processed의 모든 필드 포함 ...

  "reasoning_method": "llm_with_rag",
  "rag_similar_cases": [
    {
      "case_id": "case_kisa_2025_034",
      "similarity": 0.87,
      "snippet": "택배 도착 안내 사칭 사례..."
    }
  ],
  "reason": "이 메시지는 택배 사칭 패턴과 매우 유사하며, ...",
  "llm_model": "claude-sonnet-4-6",
  "reasoned_at": "2026-05-29T15:30:05+09:00"
}
```

| 추가 필드 | 타입 | 설명 |
|---|---|---|
| `reasoning_method` | string | `llm_only` / `llm_with_rag` / `skipped_blacklist` |
| `rag_similar_cases` | list / null | Vector DB 유사 사례 (`reasoning_method = llm_with_rag` 시) |
| `reason` | string | LLM이 생성한 판정 근거 |
| `llm_model` | string | 사용된 LLM 모델명 |
| `reasoned_at` | ISO8601 | LLM 처리 시각 |

**`reasoning_method` 분기 규칙**:
- `static_filter_hit = true` → `skipped_blacklist` (블랙리스트 매칭은 reason 단계 건너뜀 또는 정형 reason 사용)
- `40 ≤ score ≤ 70` → `llm_with_rag`
- 그 외 → `llm_only`

---

## 4. MySQL 스키마

### 4-1. `blacklist` 테이블 (정적 필터링용)

```sql
CREATE TABLE blacklist (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    pattern_type ENUM('url', 'phone', 'domain') NOT NULL,
    pattern_value VARCHAR(500) NOT NULL,
    pattern_hash CHAR(64) NOT NULL UNIQUE,        -- SHA-256, 중복 방지
    category VARCHAR(32),                          -- '택배사칭', '금융사칭' 등
    source VARCHAR(32),                            -- 'openphish', 'kisa', 'user_report'
    severity ENUM('low', 'medium', 'high') DEFAULT 'medium',
    first_seen_at TIMESTAMP,
    last_seen_at TIMESTAMP,
    report_count INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_value (pattern_value(255)),
    INDEX idx_type_active (pattern_type, is_active),
    INDEX idx_category (category)
);
```

**용도**: Stage 2에서 URL/전화번호/도메인을 빠르게 조회.

**조회 패턴 예시**:
```sql
SELECT id, pattern_type, category
FROM blacklist
WHERE pattern_value IN ('http://fake-bank.kr', '010-1234-5678')
  AND is_active = TRUE;
```

### 4-2. `processing_log` 테이블 (처리 이력)

```sql
CREATE TABLE processing_log (
    id CHAR(36) PRIMARY KEY,                       -- UUID, S3 파일 ID와 동일
    source_text_hash CHAR(64),                     -- 중복 입력 감지용

    -- 진행 단계
    current_stage ENUM('raw', 'labeled', 'processed', 'reason') NOT NULL,
    stage_completed_at JSON,                       -- {"raw": "...", "labeled": "...", ...}

    -- Stage 2: 정적 필터링
    static_filter_hit BOOLEAN DEFAULT FALSE,
    matched_blacklist_id BIGINT,

    -- Stage 3: 모델 결과 (핵심 지표만)
    label TINYINT,                                 -- 0 or 1
    score TINYINT,                                 -- 0~100
    risk_level VARCHAR(16),
    model_version VARCHAR(32),

    -- Stage 4: LLM 결과
    reasoning_method ENUM('llm_only', 'llm_with_rag', 'skipped_blacklist'),
    llm_model VARCHAR(32),

    -- S3 경로 (단계별)
    s3_raw_path VARCHAR(500),
    s3_raw_line_no INT,                            -- raw 배치 파일 내 행 번호 (0-based)
    s3_labeled_path VARCHAR(500),
    s3_labeled_line_no INT,
    s3_processed_path VARCHAR(500),
    s3_processed_line_no INT,
    s3_reason_path VARCHAR(500),
    s3_reason_line_no INT,

    source VARCHAR(32),                            -- 입력 출처
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_stage (current_stage),
    INDEX idx_label_score (label, score),
    INDEX idx_created (created_at),
    INDEX idx_source_hash (source_text_hash),
    FOREIGN KEY (matched_blacklist_id) REFERENCES blacklist(id)
);
```

**용도**:
- 한 SMS의 전체 처리 흐름을 한 행으로 추적
- 일별 통계, 단계별 실패율, 분류 결과 분포 등 빠르게 조회
- 핵심 지표는 DB, 상세 데이터는 `s3_*_path`로 접근

**조회 패턴 예시**:
```sql
-- 오늘 처리된 스미싱 건수
SELECT COUNT(*) FROM processing_log
WHERE DATE(created_at) = CURDATE() AND label = 1;

-- 단계별 미완료 건
SELECT current_stage, COUNT(*) FROM processing_log
WHERE current_stage != 'reason'
GROUP BY current_stage;
```

### 4-3. `label_audit` 테이블 (데이터 검수)

```sql
CREATE TABLE label_audit (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sms_id CHAR(36) NOT NULL,                      -- processing_log.id 참조

    -- 자동 검수 결과 (Cleanlab 등)
    audit_source ENUM('cleanlab', 'manual', 'rule') NOT NULL,
    suspected_label TINYINT,                       -- 의심되는 정답 라벨
    current_label TINYINT,                         -- 현재 부여된 라벨
    confidence FLOAT,                              -- 의심 강도 (0~1)
    reason VARCHAR(500),                           -- 검수 사유

    -- 처리 상태
    status ENUM('pending', 'reviewed', 'relabeled', 'rejected')
        DEFAULT 'pending',
    reviewer VARCHAR(64),
    reviewed_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_sms_id (sms_id),
    INDEX idx_status (status),
    INDEX idx_audit_source (audit_source),
    FOREIGN KEY (sms_id) REFERENCES processing_log(id)
);
```

**용도**: 자동/수동 검수에서 잘못 라벨링된 것으로 의심되는 건을 큐로 관리.
- Cleanlab 등의 도구가 의심 라벨 목록 생성 → 이 테이블에 적재
- 검수자가 확인 후 status 갱신
- `relabeled` 된 건은 재학습 데이터 생성에 반영

---

## 5. ChromaDB 스키마

### 5-1. 컬렉션 개요

**컬렉션명**: `smishing_cases`
**용도**: Stage 4에서 score 40~70인 애매한 케이스의 유사 사례 검색 (RAG)

### 5-2. 벡터화 설정

| 항목 | 값 | 비고 |
|---|---|---|
| 임베딩 모델 | `jhgan/ko-sroberta-multitask` | HuggingFace, 한국어 SBERT |
| 벡터 차원 | 768 | 위 모델 기준 (고정) |
| 거리 측정 | Cosine | 컬렉션 생성 시 지정, 변경 불가 |
| 토큰 최대 길이 | 128 (TBD) | SmsClassifier와 동일하게 가는지 검토 필요 |
| 청킹 전략 | **TBD** | SMS는 보통 짧아 청킹 없이 1건=1벡터로 가도 됨. 피해 사례 글이 길면 분할 필요 |

**주의**: 임베딩 모델을 바꾸면 **저장된 모든 벡터를 재임베딩해야 한다.**
모델 결정은 신중하게, 변경 시 마이그레이션 계획 필요.

### 5-3. 데이터 구조

```python
collection.add(
    ids=["case_{source}_{doc_id}_chunk_{idx}"],
    embeddings=[[...768개 float...]],
    documents=["정제된 텍스트 청크"],
    metadatas=[{
        # ─ 식별/추적 ───────────────
        "source": "kisa" | "openphish" | "user_confirmed" | "...",
        "original_doc_id": "doc_001",
        "chunk_idx": 0,
        "s3_raw_path": "s3://.../raw/...",

        # ─ 분류 정보 ───────────────
        "category": "택배사칭" | "금융사칭" | "...",
        "language": "ko",
        "verified": true | false,

        # ─ 시각 ───────────────────
        "collected_at": "2025-01-15",
    }],
)
```

### 5-4. 미정 (팀 논의 필요)

다음 항목들은 아직 결정되지 않았다. **데이터를 넣기 전에 합의 필요.**

#### Q1. ChromaDB에 무엇을 넣을 것인가?

세 가지 후보:

| 후보 | 설명 | 장단점 |
|---|---|---|
| A. 외부 검증된 사례만 | KISA·OpenPhish 등에서 크롤링한 확정 스미싱 사례 | 깨끗하지만 양 제한적 |
| B. 사용자 입력 중 확정 케이스 | `label=1` 이고 검수자 확인된 것 | 도메인 적합도 높음 |
| C. 모든 처리된 SMS | 모든 inference 결과를 자동 적재 | 양 폭발, 노이즈 많음 |

권장: **A + B 조합** (외부 사례 + 확정 사용자 케이스).
순수 inference 결과(C)는 안 넣는 게 표준.

#### Q2. 메타데이터에 모델 출력을 포함할 것인가?

모델 출력(score, label, prob_1_risk 등)을 ChromaDB metadata에 같이 넣을지 결정 필요.

| 옵션 | 장점 | 단점 |
|---|---|---|
| 모델 출력 그대로 다 | 검색 시 다양한 필터링 가능 (`score > 80` 등) | DB 무거워짐, 일부는 사용 안 함 |
| 검색용 핵심만 선별 | 가볍고 빠름 | 나중에 새 필터 추가 시 재적재 필요 |
| 모델 출력 미포함 | 가장 단순 | 검색-분류 분리, 일관성 떨어질 수 있음 |

**현재 안**: 검색 빈도 높은 필드만 포함 (category, source, verified, collected_at).
모델 출력은 MySQL/S3에 두고, ChromaDB ID로 조인.

#### Q3. 청킹 전략

- SMS 본문(보통 1~300자): 청킹 없이 통째로
- 피해 사례 글(긴 텍스트): 분할 기준 필요 (문단? 500자?)
- 결정 후 실측 데이터로 청크 크기 튜닝

#### Q4. 업데이트/중복 처리

- 같은 사례가 또 들어오면? → 텍스트 해시로 중복 체크
- ID 충돌 시 정책: 덮어쓰기 vs 거부 vs 버전 관리

#### Q5. Chroma → 운영 시점에 다른 Vector DB로 이전?

ChromaDB는 프로토타입 단계 권장. 운영 단계에선 pgvector나 Qdrant 고려.
이전 시점/조건 정의 필요.

---

## 6. DuckDB (분석/모니터링)

**역할**: 실시간 파이프라인 **바깥**에서, S3에 누적된 JSONL 데이터를 SQL로 빠르게 집계.
- 모니터링 대시보드 데이터 소스 (업무 12)
- 데이터 검수 (업무 19)
- 학습/평가 데이터 슬라이싱 (모델링 팀 보조)

**위치**: 실시간 파이프라인엔 들어가지 않음. MySQL과 역할 분리.

| 항목 | MySQL | DuckDB |
|---|---|---|
| 용도 | 실시간 조회/저장 (OLTP) | 배치 분석/집계 (OLAP) |
| 데이터 위치 | DB 서버 안 | S3 파일 직접 읽음 |
| 작업 예시 | "이 URL 블랙리스트에 있나?" | "지난주 score 평균은?" |

### 사용 패턴

DuckDB는 별도 서버를 띄우지 않고 **분석이 필요할 때 Python에서 임시로 실행**한다.
S3 접근은 `httpfs` 확장으로 처리.

```python
import duckdb

con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs;")
con.execute("""
    SET s3_region='ap-northeast-2';
    SET s3_access_key_id='...';
    SET s3_secret_access_key='...';
""")
```

### 표준 쿼리 예시

**일별 처리 통계** (대시보드용):
```sql
SELECT
  DATE(received_at) AS day,
  COUNT(*) AS total,
  SUM(label) AS smishing_count,
  AVG(score) AS avg_score,
  COUNTIF(static_filter_hit) AS blacklist_hits,
  COUNTIF(reasoning_method = 'llm_with_rag') AS rag_used
FROM read_json_auto('s3://smishing-dev-newbies-2026/reason/2026/**/*.jsonl')
GROUP BY day
ORDER BY day DESC;
```

**score 분포** (모델 성능 점검용):
```sql
SELECT
  CASE
    WHEN score < 40 THEN '0-39'
    WHEN score < 70 THEN '40-69'
    ELSE '70-100'
  END AS bucket,
  COUNT(*) AS cnt
FROM read_json_auto('s3://.../processed/**/*.jsonl')
GROUP BY bucket;
```

**애매 케이스 추출** (수동 검수/재학습 후보 선별):
```sql
COPY (
  SELECT id, source_text, score, label, reason
  FROM read_json_auto('s3://.../reason/**/*.jsonl')
  WHERE score BETWEEN 40 AND 70
) TO 's3://.../analytics/ambiguous_cases.parquet' (FORMAT PARQUET);
```

### 분석용 Parquet 캐시 (선택)

JSONL 직접 스캔이 느려지면 **주기적으로 Parquet으로 변환**한다.
대상 위치: `s3://smishing-dev-newbies-2026/analytics/`

```
analytics/
├── daily_stats/YYYY/MM/DD.parquet      # 일별 집계 캐시
└── monthly_dump/YYYY/MM/full.parquet   # 월별 전체 덤프 (모델 학습용)
```

DuckDB는 Parquet 스캔이 JSONL보다 훨씬 빠르므로 (10배 이상),
대시보드가 실시간 응답해야 하면 캐시 레이어를 둔다.

---

## 7. 파일명 / ID 규칙

- **SMS ID**: UUID4 (예: `550e8400-e29b-41d4-a716-446655440000`)
- **S3 경로**: `{stage}/YYYY/MM/DD/{id}.jsonl`
- **시각 형식**: ISO 8601 + KST (`+09:00`)
- **JSON 인코딩**: UTF-8, `ensure_ascii=false`

---

## 8. 결정 대기 항목 (팀 논의 필요)

| 항목 | 후보 | 메모 |
|---|---|---|
| LLM 모델 | Claude / OpenAI / 로컬 | 비용·속도·품질 기준 결정 필요 |
| ~~임베딩 모델~~ | ~~ko-sroberta / BGE-m3-ko / KURE~~ | **확정: `jhgan/ko-sroberta-multitask` (768차원)** |
| Vector DB 이전 시점 | Chroma → pgvector/Qdrant | 운영 단계 진입 시 검토 |
| ChromaDB 적재 대상 | 외부 사례 / 확정 사용자 케이스 / 전부 | Section 5-4 Q1 참조 |
| ChromaDB 메타데이터 범위 | 모델 출력 포함 여부 | Section 5-4 Q2 참조 |
| 청킹 전략 | SMS 그대로 / 긴 글 분할 기준 | Section 5-4 Q3 참조 |
| `score` 임계값 | 40 / 70 | 운영 데이터로 보정 가능 |
| 데이터 보존 기간 | raw 영구? / 90일? | PIPA·저장 비용 고려 |
| PII 마스킹 정책 | 전화번호 일부 마스킹? 해시? | 업무 17과 연계 |
| 배치 flush 주기 | 5분 / 10분 / 1000건 | 백엔드 응답 지연 고려 |

---

## 9. 변경 이력

| 버전 | 일자 | 변경 내용 | 작성자 |
|---|---|---|---|
| v0.1 | 2026-05-29 | 초안 작성 | (작성자) |
| v0.2 | 2026-05-29 | S3 배치 단위 저장 정책 추가, DuckDB 섹션 신설 | (작성자) |
| v0.3 | 2026-05-29 | 작업별 데이터 흐름 매트릭스 추가, `label_audit` 테이블 추가, S3 폴더(`images/`, `vectordb_source/`, `exports/`, `analytics/`) 추가 | (작성자) |
| v0.4 | 2026-05-29 | ChromaDB 임베딩 모델 확정(`ko-sroberta-multitask`), 벡터화 설정 명시, 미정 항목 5개 정리 | (작성자) |
