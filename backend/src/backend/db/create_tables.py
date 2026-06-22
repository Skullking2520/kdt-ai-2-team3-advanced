from sqlalchemy import text

from .base import Base, engine

SMISHING_LOG_COLUMNS = {
    "content": "content TEXT NULL",
    "is_smishing": "is_smishing BOOLEAN NOT NULL DEFAULT FALSE",
    "detection_type": (
        "detection_type ENUM('STATIC_PATTERN', 'ENCODER', 'RAG_DECODER') "
        "NOT NULL DEFAULT 'STATIC_PATTERN'"
    ),
    "input_type": "input_type ENUM('SMS', 'URL', 'IMAGE', 'PHONE') NULL",
    "ai_score": "ai_score DECIMAL(5, 4) NULL",
    "reasoning": "reasoning TEXT NULL",
    "consent_for_training": (
        "consent_for_training BOOLEAN NOT NULL DEFAULT FALSE"
    ),
    "static_url_match": "static_url_match BOOLEAN NOT NULL DEFAULT FALSE",
    "model_id": "model_id INT NULL",
    "created_at": "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
}


async def _column_exists(conn, table_name: str, column_name: str) -> bool:
    result = await conn.execute(
        text(
            """
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = :table_name
              AND column_name = :column_name
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    )
    return bool(result.scalar_one())


async def _ensure_smishing_logs_schema(conn) -> None:
    for column_name, definition in SMISHING_LOG_COLUMNS.items():
        if await _column_exists(conn, "smishing_logs", column_name):
            continue
        await conn.execute(
            text(f"ALTER TABLE smishing_logs ADD COLUMN {definition}")
        )


async def create_db_tables():
    async with engine.begin() as conn:
        print("테이블 생성을 시작합니다...")
        # Base에 등록된 모든 테이블 생성
        # 동기 메서드인 create_all을 비동기 커넥션 위에서 생성
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_smishing_logs_schema(conn)
        print("테이블 생성 완료!")
