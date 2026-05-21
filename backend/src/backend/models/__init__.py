# orm 모델 (sqlalchemy)
from ..db.base import Base  # 공통 Base 가져오기

# 테이블 생성을 위해 모든 모델 파일을 명시적으로 import
from .model_info import ModelInfo
from .smishing_log import SmishingLog
from .static_patterns import StaticPattern

# 외부(예: main.py)에서 쓸 수 있도록 노출 (선택사항)
__all__ = ["Base", "ModelInfo", "SmishingLog", "StaticPattern"]
