from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import generate, segment

app = FastAPI(title="拼豆图纸转化器后端", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router, prefix="/api/generate", tags=["AI生成"])
app.include_router(segment.router, prefix="/api/segment", tags=["图像分割"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
