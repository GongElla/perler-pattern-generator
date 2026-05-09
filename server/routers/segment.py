from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import List

router = APIRouter()


class Point(BaseModel):
    x: int
    y: int


class SegmentRequest(BaseModel):
    points: List[Point]


class SegmentResponse(BaseModel):
    mask_url: str
    segmented_image_url: str


@router.post("/image", response_model=SegmentResponse)
async def segment_image(
    file: UploadFile = File(...),
    points: str = "",
):
    """
    TODO: 接入图像分割模型（SAM / 自研轻量模型）
    用户上传图片并点击/框选区域，后端返回分割掩码和裁剪后的图像。
    """
    return SegmentResponse(
        mask_url="",
        segmented_image_url="",
    )
