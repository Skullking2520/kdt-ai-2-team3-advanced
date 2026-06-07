from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import TIMESTAMP, Boolean, Enum, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base

if TYPE_CHECKING:
    from .model_info import ModelInfo  # 실행 시에는 무시, 타입 체크


class DetectionType(enum.Enum):
    STATIC_PATTERN = "STATIC_PATTERN"  # 정적 패턴 블랙리스트 매칭
    ENCODER = "ENCODER"                # 인코더 명확 판정 (정상 또는 스미싱)
    RAG_DECODER = "RAG_DECODER"        # 인코더 점수 애매 → RAG + 디코더 최종 판정


class SmishingLog(Base):
    __tablename__ = "smishing_logs"
    __table_args__ = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    message_content: Mapped[str] = mapped_column(Text, nullable=False)
    is_smishing: Mapped[bool] = mapped_column(Boolean, nullable=False)
    detection_type: Mapped[DetectionType] = mapped_column(Enum(DetectionType), nullable=False)
    ai_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=True)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)  # 디코더 출력 결과

    model_id: Mapped[int | None] = mapped_column(ForeignKey("model_info.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    model: Mapped[ModelInfo | None] = relationship(back_populates="logs")
