import enum
from datetime import datetime

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Enum,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


class PatternType(enum.Enum):
    URL = "url"
    PHONE = "phone"
    DOMAIN = "domain"


class Severity(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


URL_CANDIDATE_MANAGED_SOURCE = "URL_CANDIDATE"


class StaticPattern(Base):
    __tablename__ = "blacklist"
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
    # DB ENUM은 소문자('url','phone','domain')이므로
    # 값(소문자)으로 저장/조회하도록 values_callable을 지정한다.
    pattern_type: Mapped[PatternType] = mapped_column(
        Enum(PatternType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    pattern_value: Mapped[str] = mapped_column(Text, nullable=False)
    pattern_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    severity: Mapped[Severity] = mapped_column(
        Enum(Severity, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False, default=Severity.MEDIUM,
    )
    first_seen_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    report_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )

    vt_score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    vt_total: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    vt_risk: Mapped[str | None] = mapped_column(String(16), nullable=True)
    vt_last_checked: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    vt_report_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
