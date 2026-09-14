from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import meta, stats, geo

app = FastAPI(title="SA Crime Analytics API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(meta.router)
app.include_router(stats.router)
app.include_router(geo.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Single-command "demo mode": if the frontend has been built, serve it as
# static files from the same FastAPI process so the whole app runs on one port.
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
