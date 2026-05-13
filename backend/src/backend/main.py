# src/backend/main.py
from fastapi import FastAPI

from .api import endpoints
from .db.create_tables import create_db_tables

app = FastAPI()

app.include_router(endpoints.router, prefix="/endpoint")

create_db_tables()


@app.get("/")
def read_root():
    return {"message": "Hello!"}
