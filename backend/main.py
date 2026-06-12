import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import OVERLAY_DIR

app = FastAPI(title="Cricket Pose Matcher API", version="1.0.0")

# Local dev origins are always allowed. Production frontend origins are added via
# the FRONTEND_ORIGINS env var (comma-separated), e.g.
#   FRONTEND_ORIGINS="https://my-app.vercel.app,https://www.my-app.com"
_default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_env_origins = [o.strip() for o in os.environ.get("FRONTEND_ORIGINS", "").split(",") if o.strip()]
allowed_origins = _default_origins + _env_origins

# Matches localhost dev ports plus *.vercel.app (incl. preview deployments).
allowed_origin_regex = os.environ.get(
    "FRONTEND_ORIGIN_REGEX",
    r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[a-z0-9-]+\.vercel\.app",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.mount("/static/overlays", StaticFiles(directory=str(OVERLAY_DIR)), name="overlays")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "Cricket Pose Matcher"}
