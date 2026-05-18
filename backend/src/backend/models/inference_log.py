from sqlalchemy import Column, Float, Integer, String

from . import Base


class InferenceLog(Base):
    __tablename__ = "inference_logs"
    __table_args__ = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(50))
    prediction = Column(Float)
