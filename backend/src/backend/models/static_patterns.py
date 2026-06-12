import enum
from datetime import datetime

from sqlalchemy import TIMESTAMP, Enum, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


class PatternType(enum.Enum):
    URL = "URL"
    PHONE = "PHONE"


URL_CANDIDATE_MANAGED_SOURCE = "URL_CANDIDATE"


# AI 연산 자원을 소모하기 전, 알려진 위협을 즉각 차단하기 위한 테이블
class StaticPattern(Base):
    __tablename__ = "static_patterns"
    __table_args__ = (
        UniqueConstraint(
            "pattern_type",
            "pattern_hash",
            name="uq_static_pattern_type_hash",
        ),
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
        },
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    pattern_type: Mapped[PatternType] = mapped_column(Enum(PatternType), nullable=False)
    pattern_value: Mapped[str] = mapped_column(Text, nullable=False)
    pattern_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    managed_source: Mapped[str | None] = mapped_column(String(30), nullable=True)
    report_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )
