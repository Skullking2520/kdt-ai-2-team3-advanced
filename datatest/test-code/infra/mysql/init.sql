-- ============================================================
-- 스미싱 파이프라인 초기 스키마
-- 스키마 문서 v0.4 기준
-- ============================================================

USE smishing;

-- ─────────────────────────────────────────────────
-- 1) blacklist : 정적 필터링용
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blacklist (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    pattern_type ENUM('url', 'phone', 'domain') NOT NULL,
    pattern_value VARCHAR(500) NOT NULL,
    pattern_hash CHAR(64) NOT NULL UNIQUE,
    category VARCHAR(32),
    source VARCHAR(32),
    severity ENUM('low', 'medium', 'high') DEFAULT 'medium',
    first_seen_at TIMESTAMP NULL,
    last_seen_at TIMESTAMP NULL,
    report_count INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_value (pattern_value(255)),
    INDEX idx_type_active (pattern_type, is_active),
    INDEX idx_category (category)
);

-- ─────────────────────────────────────────────────
-- 2) processing_log : 처리 이력
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processing_log (
    id CHAR(36) PRIMARY KEY,
    source_text_hash CHAR(64),

    current_stage ENUM('raw', 'labeled', 'processed', 'reason') NOT NULL,
    stage_completed_at JSON,

    static_filter_hit BOOLEAN DEFAULT FALSE,
    matched_blacklist_id BIGINT,

    label TINYINT,
    score TINYINT,
    risk_level VARCHAR(16),
    model_version VARCHAR(32),

    reasoning_method ENUM('llm_only', 'llm_with_rag', 'skipped_blacklist'),
    llm_model VARCHAR(32),

    s3_raw_path VARCHAR(500),
    s3_raw_line_no INT,
    s3_labeled_path VARCHAR(500),
    s3_labeled_line_no INT,
    s3_processed_path VARCHAR(500),
    s3_processed_line_no INT,
    s3_reason_path VARCHAR(500),
    s3_reason_line_no INT,

    source VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_stage (current_stage),
    INDEX idx_label_score (label, score),
    INDEX idx_created (created_at),
    INDEX idx_source_hash (source_text_hash),
    FOREIGN KEY (matched_blacklist_id) REFERENCES blacklist(id)
);

-- ─────────────────────────────────────────────────
-- 3) label_audit : 데이터 검수
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS label_audit (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sms_id CHAR(36) NOT NULL,

    audit_source ENUM('cleanlab', 'manual', 'rule') NOT NULL,
    suspected_label TINYINT,
    current_label TINYINT,
    confidence FLOAT,
    reason VARCHAR(500),

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

-- ─────────────────────────────────────────────────
-- 동작 확인용 샘플 데이터 (선택, 나중에 지워도 됨)
-- ─────────────────────────────────────────────────
INSERT IGNORE INTO blacklist
    (pattern_type, pattern_value, pattern_hash, category, source, severity)
VALUES
    ('url', 'http://fake-delivery.kr',
     SHA2('http://fake-delivery.kr', 256),
     '택배사칭', 'sample', 'high'),
    ('phone', '02-1234-5678',
     SHA2('02-1234-5678', 256),
     '결제사칭', 'sample', 'medium');

-- ─────────────────────────────────────────────────
-- blacklist에 VT 컬럼 추가
-- ─────────────────────────────────────────────────
ALTER TABLE blacklist
    ADD COLUMN vt_score        TINYINT     NULL COMMENT '악성 탐지 엔진 수',
    ADD COLUMN vt_total        TINYINT     NULL COMMENT '전체 검사 엔진 수',
    ADD COLUMN vt_risk         VARCHAR(16) NULL COMMENT '위험등급(한글)',
    ADD COLUMN vt_last_checked TIMESTAMP   NULL COMMENT '마지막 VT 조회 시각',
    ADD COLUMN vt_report_path  VARCHAR(500) NULL COMMENT 'S3 원본 응답 경로';

-- ─────────────────────────────────────────────────
-- 4) vt_quota : VirusTotal 일별 사용량 추적
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vt_quota (
    date         DATE     PRIMARY KEY,
    auto_used    INT      DEFAULT 0,
    manual_used  INT      DEFAULT 0,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);