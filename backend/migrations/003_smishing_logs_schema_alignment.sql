-- Re-runnable MySQL migration for smishing_logs schema alignment.
-- Back up the database before applying this file in production.

DELIMITER //

DROP PROCEDURE IF EXISTS apply_smishing_logs_schema_alignment//
CREATE PROCEDURE apply_smishing_logs_schema_alignment()
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'content'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN content TEXT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'is_smishing'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN is_smishing BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'detection_type'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN detection_type ENUM('STATIC_PATTERN', 'ENCODER', 'RAG_DECODER')
            NOT NULL DEFAULT 'STATIC_PATTERN';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'input_type'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN input_type ENUM('SMS', 'URL', 'IMAGE', 'PHONE') NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'ai_score'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN ai_score DECIMAL(5, 4) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'reasoning'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN reasoning TEXT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'consent_for_training'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN consent_for_training BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'static_url_match'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN static_url_match BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'model_id'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN model_id INT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'created_at'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END//

CALL apply_smishing_logs_schema_alignment()//
DROP PROCEDURE IF EXISTS apply_smishing_logs_schema_alignment//

DELIMITER ;
