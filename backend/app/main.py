from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    checkin,
    coach,
    experiments,
    health,
    insights,
    recommendations,
    trends,
    user_state,
)
from app.core.config import settings
from app.db.session import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(user_state.router)
app.include_router(recommendations.router)
app.include_router(checkin.router)
app.include_router(experiments.router)
app.include_router(insights.router)
app.include_router(trends.router)
app.include_router(coach.router)


@app.get("/")
def root():
    return {"app": settings.app_name, "status": "ok"}
