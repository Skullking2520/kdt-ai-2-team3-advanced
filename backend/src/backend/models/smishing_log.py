from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import TIMESTAMP, Boolean, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base

if TYPE_CHECKING:
    from .model_info import ModelInfo  # 실행 시에는 무시, 타입 체크


class DetectionSource(enum.Enum):
    STATIC = "STATIC"
    AI = "AI"


class SmishingLog(Base):
    __tablename__ = "smishing_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sender_number: Mapped[str] = mapped_column(String(20), nullable=True)
    message_content: Mapped[str] = mapped_column(Text, nullable=False)
    is_smishing: Mapped[bool] = mapped_column(Boolean, nullable=False)
    detection_source: Mapped[DetectionSource] = mapped_column(
        Enum(DetectionSource), nullable=False
    )
    ai_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=True)
    reasoning: Mapped[str] = mapped_column(Text, nullable=True)  # 디코더 출력 결과

    model_id: Mapped[int] = mapped_column(ForeignKey("model_info.id"), nullable=True)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    model: Mapped[ModelInfo] = relationship(back_populates="logs")
