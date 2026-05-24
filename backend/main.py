from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import deployments, field_config
from startup import run_startup


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_startup()
    yield


app = FastAPI(title="Deployments Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deployments.router)
app.include_router(field_config.router)


@app.get("/health")
def health():
    return {"status": "ok"}
