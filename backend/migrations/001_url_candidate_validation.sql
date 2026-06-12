-- Re-runnable MySQL migration for URL candidate validation.
-- Back up the database before applying this file in production.

CREATE TABLE IF NOT EXISTS static_patterns (
    id INT NOT NULL AUTO_INCREMENT,
    pattern_type ENUM('URL', 'PHONE') NOT NULL,
    pattern_value TEXT NOT NULL,
    pattern_hash CHAR(64) NOT NULL,
    description VARCHAR(255) NULL,
    managed_source VARCHAR(30) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_static_pattern_type_hash (
        pattern_type,
        pattern_hash
    )
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS url_candidates (
    id INT NOT NULL AUTO_INCREMENT,
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    url_hash CHAR(64) NOT NULL,
    last_source ENUM('MODEL', 'USER_REPORT') NOT NULL,
    report_count INT NOT NULL DEFAULT 0,
    model_detection_count INT NOT NULL DEFAULT 0,
    max_confidence FLOAT NULL,
    description VARCHAR(255) NULL,
    vt_malicious_count INT NULL,
    vt_suspicious_count INT NULL,
    vt_total_count INT NULL,
    vt_last_checked_at TIMESTAMP NULL,
    next_check_at TIMESTAMP NULL,
    vt_last_error VARCHAR(255) NULL,
    reviewed_at TIMESTAMP NULL,
    reviewer VARCHAR(100) NULL,
    review_note VARCHAR(500) NULL,
    processing_token VARCHAR(36) NULL,
    status ENUM(
        'PENDING',
        'REVIEW_REQUIRED',
        'APPROVED',
        'REJECTED'
    ) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_url_candidates_url_hash (url_hash),
    KEY ix_url_candidates_status (status),
    KEY ix_url_candidates_next_check_at (next_check_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS virustotal_quota (
    quota_date DATE NOT NULL,
    used_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (quota_date)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

DELIMITER //

DROP PROCEDURE IF EXISTS apply_url_candidate_validation_migration//
CREATE PROCEDURE apply_url_candidate_validation_migration()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE managed_source_added INT DEFAULT 0;
    DECLARE current_id INT;
    DECLARE current_type VARCHAR(20);
    DECLARE current_value TEXT;
    DECLARE fragmentless TEXT;
    DECLARE scheme_position INT;
    DECLARE rest_value TEXT;
    DECLARE authority_value TEXT;
    DECLARE normalized_value TEXT;
    DECLARE trailing_character CHAR(1);
    DECLARE static_pattern_cursor CURSOR FOR
        SELECT id, pattern_type, pattern_value
        FROM static_patterns;
    DECLARE url_candidate_cursor CURSOR FOR
        SELECT id, 'URL', normalized_url
        FROM url_candidates;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'static_patterns'
          AND column_name = 'pattern_hash'
    ) THEN
        ALTER TABLE static_patterns
            ADD COLUMN pattern_hash CHAR(64) NULL AFTER pattern_value;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'static_patterns'
          AND column_name = 'managed_source'
    ) THEN
        ALTER TABLE static_patterns
            ADD COLUMN managed_source VARCHAR(30) NULL AFTER description;
        SET managed_source_added = 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN reviewed_at TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'reviewer'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN reviewer VARCHAR(100) NULL AFTER reviewed_at;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'review_note'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN review_note VARCHAR(500) NULL AFTER reviewer;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'processing_token'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN processing_token VARCHAR(36) NULL AFTER review_note;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'url_hash'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN url_hash CHAR(64) NULL AFTER normalized_url;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'report_count'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN report_count INT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'model_detection_count'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN model_detection_count INT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'max_confidence'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN max_confidence FLOAT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'description'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN description VARCHAR(255) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'vt_malicious_count'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN vt_malicious_count INT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'vt_suspicious_count'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN vt_suspicious_count INT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'vt_total_count'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN vt_total_count INT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'vt_last_checked_at'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN vt_last_checked_at TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'next_check_at'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN next_check_at TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'vt_last_error'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN vt_last_error VARCHAR(255) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'status'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN status ENUM(
                'PENDING',
                'REVIEW_REQUIRED',
                'APPROVED',
                'REJECTED'
            ) NOT NULL DEFAULT 'PENDING';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'created_at'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN created_at TIMESTAMP NOT NULL
            DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE url_candidates
            ADD COLUMN updated_at TIMESTAMP NOT NULL
            DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'static_patterns'
          AND index_name = 'ix_static_patterns_pattern_value'
    ) THEN
        ALTER TABLE static_patterns
            DROP INDEX ix_static_patterns_pattern_value;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'static_patterns'
          AND index_name = 'uq_static_pattern_type_value'
    ) THEN
        ALTER TABLE static_patterns
            DROP INDEX uq_static_pattern_type_value;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND index_name = 'normalized_url'
    ) THEN
        ALTER TABLE url_candidates DROP INDEX normalized_url;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND index_name = 'ix_url_candidates_normalized_url'
    ) THEN
        ALTER TABLE url_candidates
            DROP INDEX ix_url_candidates_normalized_url;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND index_name = 'uq_url_candidates_normalized_url'
    ) THEN
        ALTER TABLE url_candidates
            DROP INDEX uq_url_candidates_normalized_url;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'static_patterns'
          AND index_name = 'uq_static_pattern_type_hash'
    ) THEN
        ALTER TABLE static_patterns
            DROP INDEX uq_static_pattern_type_hash;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND index_name = 'uq_url_candidates_url_hash'
    ) THEN
        ALTER TABLE url_candidates
            DROP INDEX uq_url_candidates_url_hash;
    END IF;

    ALTER TABLE static_patterns
        MODIFY COLUMN pattern_value TEXT NOT NULL;
    ALTER TABLE url_candidates
        MODIFY COLUMN url TEXT NOT NULL,
        MODIFY COLUMN normalized_url TEXT NOT NULL,
        MODIFY COLUMN status ENUM(
            'PENDING',
            'REVIEW_REQUIRED',
            'APPROVED',
            'REJECTED'
        ) NOT NULL DEFAULT 'PENDING';

    IF managed_source_added = 1 THEN
        UPDATE static_patterns
        SET managed_source = 'URL_CANDIDATE'
        WHERE managed_source IS NULL
          AND pattern_type = 'URL'
          AND (
              description LIKE 'VirusTotal 자동 승인%'
              OR description LIKE '관리자 승인 URL 후보%'
          );
    END IF;

    SET done = 0;
    OPEN static_pattern_cursor;
    static_pattern_loop: LOOP
        FETCH static_pattern_cursor
        INTO current_id, current_type, current_value;
        IF done = 1 THEN
            LEAVE static_pattern_loop;
        END IF;

        SET normalized_value = TRIM(current_value);
        IF current_type = 'URL' THEN
            SET trailing_character = RIGHT(normalized_value, 1);
            WHILE trailing_character IN (
                '.', ',', ';', ':', '!', '?', '"', ''''
            )
            OR (
                trailing_character = ')'
                AND (
                    CHAR_LENGTH(normalized_value)
                    - CHAR_LENGTH(REPLACE(normalized_value, ')', ''))
                ) > (
                    CHAR_LENGTH(normalized_value)
                    - CHAR_LENGTH(REPLACE(normalized_value, '(', ''))
                )
            )
            OR (
                trailing_character = ']'
                AND (
                    CHAR_LENGTH(normalized_value)
                    - CHAR_LENGTH(REPLACE(normalized_value, ']', ''))
                ) > (
                    CHAR_LENGTH(normalized_value)
                    - CHAR_LENGTH(REPLACE(normalized_value, '[', ''))
                )
            )
            OR (
                trailing_character = '}'
                AND (
                    CHAR_LENGTH(normalized_value)
                    - CHAR_LENGTH(REPLACE(normalized_value, '}', ''))
                ) > (
                    CHAR_LENGTH(normalized_value)
                    - CHAR_LENGTH(REPLACE(normalized_value, '{', ''))
                )
            ) DO
                SET normalized_value = LEFT(
                    normalized_value,
                    CHAR_LENGTH(normalized_value) - 1
                );
                SET trailing_character = RIGHT(normalized_value, 1);
            END WHILE;
            SET fragmentless = SUBSTRING_INDEX(normalized_value, '#', 1);
            SET scheme_position = LOCATE('://', fragmentless);
            IF scheme_position > 0 THEN
                SET rest_value = SUBSTRING(
                    fragmentless,
                    scheme_position + 3
                );
                SET authority_value = SUBSTRING_INDEX(
                    SUBSTRING_INDEX(rest_value, '/', 1),
                    '?',
                    1
                );
                SET normalized_value = CONCAT(
                    LOWER(SUBSTRING(fragmentless, 1, scheme_position - 1)),
                    '://',
                    LOWER(authority_value),
                    SUBSTRING(rest_value, LENGTH(authority_value) + 1)
                );
            ELSE
                SET authority_value = SUBSTRING_INDEX(
                    SUBSTRING_INDEX(fragmentless, '/', 1),
                    '?',
                    1
                );
                SET normalized_value = CONCAT(
                    'https://',
                    LOWER(authority_value),
                    SUBSTRING(fragmentless, LENGTH(authority_value) + 1)
                );
            END IF;
        END IF;

        UPDATE static_patterns
        SET pattern_value = normalized_value,
            pattern_hash = SHA2(normalized_value, 256)
        WHERE id = current_id;
    END LOOP;
    CLOSE static_pattern_cursor;

    SET done = 0;
    OPEN url_candidate_cursor;
    url_candidate_loop: LOOP
        FETCH url_candidate_cursor
        INTO current_id, current_type, current_value;
        IF done = 1 THEN
            LEAVE url_candidate_loop;
        END IF;

        SET normalized_value = TRIM(current_value);
        SET trailing_character = RIGHT(normalized_value, 1);
        WHILE trailing_character IN (
            '.', ',', ';', ':', '!', '?', '"', ''''
        )
        OR (
            trailing_character = ')'
            AND (
                CHAR_LENGTH(normalized_value)
                - CHAR_LENGTH(REPLACE(normalized_value, ')', ''))
            ) > (
                CHAR_LENGTH(normalized_value)
                - CHAR_LENGTH(REPLACE(normalized_value, '(', ''))
            )
        )
        OR (
            trailing_character = ']'
            AND (
                CHAR_LENGTH(normalized_value)
                - CHAR_LENGTH(REPLACE(normalized_value, ']', ''))
            ) > (
                CHAR_LENGTH(normalized_value)
                - CHAR_LENGTH(REPLACE(normalized_value, '[', ''))
            )
        )
        OR (
            trailing_character = '}'
            AND (
                CHAR_LENGTH(normalized_value)
                - CHAR_LENGTH(REPLACE(normalized_value, '}', ''))
            ) > (
                CHAR_LENGTH(normalized_value)
                - CHAR_LENGTH(REPLACE(normalized_value, '{', ''))
            )
        ) DO
            SET normalized_value = LEFT(
                normalized_value,
                CHAR_LENGTH(normalized_value) - 1
            );
            SET trailing_character = RIGHT(normalized_value, 1);
        END WHILE;
        SET fragmentless = SUBSTRING_INDEX(normalized_value, '#', 1);
        SET scheme_position = LOCATE('://', fragmentless);
        IF scheme_position > 0 THEN
            SET rest_value = SUBSTRING(
                fragmentless,
                scheme_position + 3
            );
            SET authority_value = SUBSTRING_INDEX(
                SUBSTRING_INDEX(rest_value, '/', 1),
                '?',
                1
            );
            SET normalized_value = CONCAT(
                LOWER(SUBSTRING(fragmentless, 1, scheme_position - 1)),
                '://',
                LOWER(authority_value),
                SUBSTRING(rest_value, LENGTH(authority_value) + 1)
            );
        ELSE
            SET authority_value = SUBSTRING_INDEX(
                SUBSTRING_INDEX(fragmentless, '/', 1),
                '?',
                1
            );
            SET normalized_value = CONCAT(
                'https://',
                LOWER(authority_value),
                SUBSTRING(fragmentless, LENGTH(authority_value) + 1)
            );
        END IF;

        UPDATE url_candidates
        SET normalized_url = normalized_value,
            url_hash = SHA2(normalized_value, 256)
        WHERE id = current_id;
    END LOOP;
    CLOSE url_candidate_cursor;

    UPDATE url_candidates AS retained_candidate
    JOIN (
        SELECT
            url_hash,
            MIN(id) AS retained_id,
            SUM(report_count) AS merged_report_count,
            SUM(model_detection_count) AS merged_model_count,
            MAX(max_confidence) AS merged_max_confidence,
            MAX(vt_malicious_count) AS merged_malicious_count,
            MAX(vt_suspicious_count) AS merged_suspicious_count,
            MAX(vt_total_count) AS merged_total_count,
            NULLIF(
                MAX(COALESCE(CAST(vt_last_checked_at AS CHAR), '')),
                ''
            ) AS merged_last_checked_at,
            CAST(
                SUBSTRING_INDEX(
                    GROUP_CONCAT(
                        id
                        ORDER BY
                            CASE status
                                WHEN 'APPROVED' THEN 4
                                WHEN 'REVIEW_REQUIRED' THEN 3
                                WHEN 'PENDING' THEN 2
                                ELSE 1
                            END DESC,
                            reviewed_at DESC,
                            id ASC
                    ),
                    ',',
                    1
                ) AS UNSIGNED
            ) AS decision_id
        FROM url_candidates
        GROUP BY url_hash
        HAVING COUNT(*) > 1
    ) AS merged_candidate
      ON retained_candidate.id = merged_candidate.retained_id
    JOIN url_candidates AS decision_candidate
      ON decision_candidate.id = merged_candidate.decision_id
    SET
        retained_candidate.report_count =
            merged_candidate.merged_report_count,
        retained_candidate.model_detection_count =
            merged_candidate.merged_model_count,
        retained_candidate.max_confidence =
            merged_candidate.merged_max_confidence,
        retained_candidate.vt_malicious_count =
            merged_candidate.merged_malicious_count,
        retained_candidate.vt_suspicious_count =
            merged_candidate.merged_suspicious_count,
        retained_candidate.vt_total_count =
            merged_candidate.merged_total_count,
        retained_candidate.vt_last_checked_at =
            merged_candidate.merged_last_checked_at,
        retained_candidate.reviewed_at = decision_candidate.reviewed_at,
        retained_candidate.reviewer = decision_candidate.reviewer,
        retained_candidate.review_note = decision_candidate.review_note,
        retained_candidate.processing_token = NULL,
        retained_candidate.status = decision_candidate.status;

    UPDATE url_candidates
    SET next_check_at = NULL,
        processing_token = NULL
    WHERE status IN ('APPROVED', 'REJECTED');

    UPDATE static_patterns AS retained_pattern
    JOIN (
        SELECT
            pattern_type,
            pattern_hash,
            MIN(id) AS retained_id,
            CASE
                WHEN SUM(managed_source IS NULL) > 0 THEN NULL
                ELSE MAX(managed_source)
            END AS merged_managed_source
        FROM static_patterns
        GROUP BY pattern_type, pattern_hash
        HAVING COUNT(*) > 1
    ) AS merged_pattern
      ON retained_pattern.id = merged_pattern.retained_id
    SET retained_pattern.managed_source =
        merged_pattern.merged_managed_source;

    DELETE duplicate_pattern
    FROM static_patterns AS duplicate_pattern
    JOIN static_patterns AS retained_pattern
      ON duplicate_pattern.pattern_type = retained_pattern.pattern_type
     AND duplicate_pattern.pattern_hash = retained_pattern.pattern_hash
     AND duplicate_pattern.id > retained_pattern.id;

    DELETE duplicate_candidate
    FROM url_candidates AS duplicate_candidate
    JOIN url_candidates AS retained_candidate
      ON duplicate_candidate.url_hash = retained_candidate.url_hash
     AND duplicate_candidate.id > retained_candidate.id;

    ALTER TABLE static_patterns
        MODIFY COLUMN pattern_hash CHAR(64) NOT NULL;
    ALTER TABLE url_candidates
        MODIFY COLUMN url_hash CHAR(64) NOT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'static_patterns'
          AND index_name = 'uq_static_pattern_type_hash'
    ) THEN
        ALTER TABLE static_patterns
            ADD CONSTRAINT uq_static_pattern_type_hash
            UNIQUE (pattern_type, pattern_hash);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND index_name = 'uq_url_candidates_url_hash'
    ) THEN
        ALTER TABLE url_candidates
            ADD CONSTRAINT uq_url_candidates_url_hash UNIQUE (url_hash);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND index_name = 'ix_url_candidates_status'
    ) THEN
        ALTER TABLE url_candidates
            ADD INDEX ix_url_candidates_status (status);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'url_candidates'
          AND index_name = 'ix_url_candidates_next_check_at'
    ) THEN
        ALTER TABLE url_candidates
            ADD INDEX ix_url_candidates_next_check_at (next_check_at);
    END IF;
END//

CALL apply_url_candidate_validation_migration()//
DROP PROCEDURE apply_url_candidate_validation_migration//

DELIMITER ;
