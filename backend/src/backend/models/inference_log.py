from sqlalchemy import Column, Float, Integer, String

from . import Base


class InferenceLog(Base):
    __tablename__ = "inference_logs"
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(50))
    prediction = Column(Float)
