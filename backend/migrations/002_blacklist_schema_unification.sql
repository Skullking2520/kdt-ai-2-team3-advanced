-- static_patterns → blacklist 통합 마이그레이션
-- 데이터팀 스키마(datatest/test-code/infra/mysql/init.sql)와 통합
-- 실행 전 DB 백업 권장

DELIMITER //

DROP PROCEDURE IF EXISTS apply_blacklist_schema_unification//
CREATE PROCEDURE apply_blacklist_schema_unification()
BEGIN

    -- ─────────────────────────────────────────────
    -- 1) blacklist 테이블이 없으면 신규 생성 (데이터팀 스키마 기준)
    -- ─────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'blacklist'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'static_patterns'
        ) THEN
            -- static_patterns 를 blacklist 로 이름 변경
            ALTER TABLE static_patterns RENAME TO blacklist;
        ELSE
            -- 완전 신규 생성
            CREATE TABLE blacklist (
                id INT NOT NULL AUTO_INCREMENT,
                pattern_type ENUM('url', 'phone', 'domain') NOT NULL,
                pattern_value TEXT NOT NULL,
                pattern_hash CHAR(64) NOT NULL,
                category VARCHAR(255) NULL,
                source VARCHAR(32) NULL,
                severity ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
                first_seen_at TIMESTAMP NULL,
                last_seen_at TIMESTAMP NULL,
                report_count INT NOT NULL DEFAULT 1,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                vt_score SMALLINT NULL,
                vt_total SMALLINT NULL,
                vt_risk VARCHAR(16) NULL,
                vt_last_checked TIMESTAMP NULL,
                vt_report_path VARCHAR(500) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uq_static_pattern_type_hash (pattern_type, pattern_hash)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        END IF;
    END IF;

    -- ─────────────────────────────────────────────
    -- 2) pattern_type ENUM 소문자 통일 (기존 데이터)
    -- ─────────────────────────────────────────────
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist'
          AND column_name = 'pattern_type'
          AND column_type LIKE "%'URL'%"
    ) THEN
        ALTER TABLE blacklist
            MODIFY COLUMN pattern_type ENUM('url', 'phone', 'domain') NOT NULL;
        UPDATE blacklist SET pattern_type = 'url'   WHERE pattern_type = 'URL';
        UPDATE blacklist SET pattern_type = 'phone' WHERE pattern_type = 'PHONE';
    END IF;

    -- ─────────────────────────────────────────────
    -- 3) description → category 컬럼 이름 변경
    -- ─────────────────────────────────────────────
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist'
          AND column_name = 'description'
    ) THEN
        ALTER TABLE blacklist
            CHANGE COLUMN description category VARCHAR(255) NULL;
    END IF;

    -- ─────────────────────────────────────────────
    -- 4) managed_source → source 컬럼 이름 변경
    -- ─────────────────────────────────────────────
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist'
          AND column_name = 'managed_source'
    ) THEN
        ALTER TABLE blacklist
            CHANGE COLUMN managed_source source VARCHAR(32) NULL;
    END IF;

    -- ─────────────────────────────────────────────
    -- 5) 신규 컬럼 추가 (없는 경우만)
    -- ─────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist' AND column_name = 'severity'
    ) THEN
        ALTER TABLE blacklist
            ADD COLUMN severity ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist' AND column_name = 'first_seen_at'
    ) THEN
        ALTER TABLE blacklist ADD COLUMN first_seen_at TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist' AND column_name = 'last_seen_at'
    ) THEN
        ALTER TABLE blacklist ADD COLUMN last_seen_at TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE blacklist
            ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist' AND column_name = 'vt_score'
    ) THEN
        ALTER TABLE blacklist ADD COLUMN vt_score SMALLINT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist' AND column_name = 'vt_total'
    ) THEN
        ALTER TABLE blacklist ADD COLUMN vt_total SMALLINT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist' AND column_name = 'vt_risk'
    ) THEN
        ALTER TABLE blacklist ADD COLUMN vt_risk VARCHAR(16) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist' AND column_name = 'vt_last_checked'
    ) THEN
        ALTER TABLE blacklist ADD COLUMN vt_last_checked TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'blacklist' AND column_name = 'vt_report_path'
    ) THEN
        ALTER TABLE blacklist ADD COLUMN vt_report_path VARCHAR(500) NULL;
    END IF;

    -- ─────────────────────────────────────────────
    -- 6) vt_quota 테이블 생성 (virustotal_quota 대체)
    -- ─────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'vt_quota'
    ) THEN
        CREATE TABLE vt_quota (
            date DATE NOT NULL,
            auto_used INT NOT NULL DEFAULT 0,
            manual_used INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (date)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

        -- 기존 virustotal_quota 데이터 이전 후 삭제
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'virustotal_quota'
        ) THEN
            INSERT IGNORE INTO vt_quota (date, auto_used)
            SELECT quota_date, used_count FROM virustotal_quota;
            DROP TABLE virustotal_quota;
        END IF;
    END IF;

    -- virustotal_quota 잔존 시 삭제
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'virustotal_quota'
    ) THEN
        DROP TABLE virustotal_quota;
    END IF;

    -- ─────────────────────────────────────────────
    -- 7) 데이터팀 테이블 생성 (없는 경우만)
    -- ─────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'processing_log'
    ) THEN
        CREATE TABLE processing_log (
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
            INDEX idx_source_hash (source_text_hash)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'label_audit'
    ) THEN
        CREATE TABLE label_audit (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            sms_id CHAR(36) NOT NULL,
            audit_source ENUM('cleanlab', 'manual', 'rule') NOT NULL,
            suspected_label TINYINT,
            current_label TINYINT,
            confidence FLOAT,
            reason VARCHAR(500),
            status ENUM('pending', 'reviewed', 'relabeled', 'rejected') DEFAULT 'pending',
            reviewer VARCHAR(64),
            reviewed_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_sms_id (sms_id),
            INDEX idx_status (status),
            INDEX idx_audit_source (audit_source)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    END IF;

END//

CALL apply_blacklist_schema_unification()//
DROP PROCEDURE apply_blacklist_schema_unification//

DELIMITER ;
