import enum
from datetime import datetime

from sqlalchemy import TIMESTAMP, Boolean, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


class PatternType(enum.Enum):
    URL = "URL"
    PHONE = "PHONE"


class StaticPattern(Base):
    __tablename__ = "blacklist"
    __table_args__ = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    pattern_type: Mapped[PatternType] = mapped_column(Enum(PatternType), nullable=False)
    pattern_value: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    pattern_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    report_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )
