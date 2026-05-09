from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class GenerateRequest(BaseModel):
    prompt: str
    width: int = 52
    height: int = 52


class GenerateResponse(BaseModel):
    image_url: str
    prompt: str


@router.post("/image", response_model=GenerateResponse)
async def generate_image(req: GenerateRequest):
    """
    TODO: 接入大模型图像生成 API（OpenAI DALL-E / Stable Diffusion / 国内大模型）
    输入 prompt，生成拼豆风格的插画，返回图片 URL。
    """
    return GenerateResponse(
        image_url="",
        prompt=req.prompt,
    )
