from __future__ import annotations

from typing import TYPE_CHECKING, List

from sqlalchemy import TIMESTAMP, Boolean, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base

if TYPE_CHECKING:
    from .smishing_log import SmishingLog  # 실행 시에는 무시, 타입 체크 시에만 참조


class ModelInfo(Base):
    __tablename__ = "model_info"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    encoder_version: Mapped[str] = mapped_column(String(50), nullable=True)
    decoder_version: Mapped[str] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, server_default=func.now())

    # 관계 설정: 하나의 모델 정보는 여러 로그를 가질 수 있음
    logs: Mapped[List[SmishingLog]] = relationship(back_populates="model")
