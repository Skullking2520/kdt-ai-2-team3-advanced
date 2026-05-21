import enum

from sqlalchemy import TIMESTAMP, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


class PatternType(enum.Enum):
    URL = "URL"
    PHONE = "PHONE"
    KEYWORD = "KEYWORD"


# AI 연산 자원을 소모하기 전, 알려진 위협을 즉각 차단하기 위한 테이블
class StaticPattern(Base):
    __tablename__ = "static_patterns"
    __table_args__ = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    pattern_type: Mapped[PatternType] = mapped_column(Enum(PatternType), nullable=False)
    pattern_value: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, server_default=func.now())
