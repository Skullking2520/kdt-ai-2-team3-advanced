-- Re-runnable MySQL migration for encoder training-data collection.
-- Back up the database before applying this file in production.

DELIMITER //

DROP PROCEDURE IF EXISTS apply_training_collection_fields//
CREATE PROCEDURE apply_training_collection_fields()
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'consent_for_training'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN consent_for_training BOOLEAN NOT NULL DEFAULT FALSE
            AFTER reasoning;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'smishing_logs'
          AND column_name = 'static_url_match'
    ) THEN
        ALTER TABLE smishing_logs
            ADD COLUMN static_url_match BOOLEAN NOT NULL DEFAULT FALSE
            AFTER consent_for_training;
    END IF;
END//

CALL apply_training_collection_fields()//
DROP PROCEDURE IF EXISTS apply_training_collection_fields//

DELIMITER ;
