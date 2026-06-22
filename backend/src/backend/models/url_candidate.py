import enum
from datetime import date, datetime

from sqlalchemy import (
    TIMESTAMP,
    Date,
    Enum,
    Float,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


class UrlCandidateStatus(enum.Enum):
    PENDING = "PENDING"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class UrlCandidateSource(enum.Enum):
    MODEL = "MODEL"
    USER_REPORT = "USER_REPORT"


class UrlCandidate(Base):
    __tablename__ = "url_candidates"
    __table_args__ = (
        UniqueConstraint(
            "url_hash",
            name="uq_url_candidates_url_hash",
        ),
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
        },
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_url: Mapped[str] = mapped_column(Text, nullable=False)
    url_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    last_source: Mapped[UrlCandidateSource] = mapped_column(
        Enum(UrlCandidateSource),
        nullable=False,
    )
    report_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    model_detection_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    max_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    vt_malicious_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vt_suspicious_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vt_total_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vt_last_checked_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        nullable=True,
    )
    next_check_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        nullable=True,
        index=True,
    )
    vt_last_error: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    reviewer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    review_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    processing_token: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
    )

    status: Mapped[UrlCandidateStatus] = mapped_column(
        Enum(UrlCandidateStatus),
        nullable=False,
        default=UrlCandidateStatus.PENDING,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP,
        server_default=func.now(),
        onupdate=func.now(),
    )


class VirusTotalQuota(Base):
    __tablename__ = "vt_quota"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    auto_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    manual_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP,
        server_default=func.now(),
        onupdate=func.now(),
    )
