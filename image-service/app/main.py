from __future__ import annotations

import os
import random
import time
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="image-service", version="0.1.0")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_REFERENCES_DIR = PROJECT_ROOT / "assets" / "hero-references"
DEFAULT_IMAGE_OUTPUT_DIR = PROJECT_ROOT / "outputs" / "image-service-temp"

REFERENCES_DIR = Path(os.getenv("HERO_REFERENCES_DIR", str(DEFAULT_REFERENCES_DIR)))
IMAGE_OUTPUT_DIR = Path(os.getenv("IMAGE_OUTPUT_DIR", str(DEFAULT_IMAGE_OUTPUT_DIR)))
IMAGE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class RuntimeConfig(BaseModel):
    image_backend: Literal["mock", "real", "ipadapter"]
    image_model_id: str
    image_device: str
    image_steps: int = Field(ge=1, le=150)
    image_guidance_scale: float = Field(ge=1.0, le=30.0)
    image_width: int = Field(ge=256, le=2048)
    image_height: int = Field(ge=256, le=4096)
    image_ip_adapter_repo: str
    image_ip_adapter_subfolder: str
    image_ip_adapter_weight: str
    image_ip_adapter_scale: float = Field(ge=0.0, le=1.0)


def _load_runtime_config() -> RuntimeConfig:
    backend = os.getenv("IMAGE_BACKEND", "mock").strip().lower()
    model_id = os.getenv("IMAGE_MODEL_ID", "stable-diffusion-local-placeholder").strip()
    device = os.getenv("IMAGE_DEVICE", "cpu").strip().lower()
    steps_raw = os.getenv("IMAGE_STEPS", "30").strip()
    guidance_raw = os.getenv("IMAGE_GUIDANCE_SCALE", "7.5").strip()
    width_raw = os.getenv("IMAGE_WIDTH", "768").strip()
    height_raw = os.getenv("IMAGE_HEIGHT", "1344").strip()
    ip_repo = os.getenv("IMAGE_IP_ADAPTER_REPO", "h94/IP-Adapter").strip()
    ip_subfolder = os.getenv("IMAGE_IP_ADAPTER_SUBFOLDER", "models").strip()
    ip_weight = os.getenv("IMAGE_IP_ADAPTER_WEIGHT", "ip-adapter_sd15.bin").strip()
    ip_scale_raw = os.getenv("IMAGE_IP_ADAPTER_SCALE", "0.7").strip()

    if backend not in {"mock", "real", "ipadapter"}:
        raise RuntimeError("IMAGE_BACKEND invalido. Valores permitidos: mock, real, ipadapter.")

    if not model_id:
        raise RuntimeError("IMAGE_MODEL_ID e obrigatorio.")

    if device not in {"cpu", "cuda", "mps"}:
        raise RuntimeError("IMAGE_DEVICE invalido. Valores permitidos: cpu, cuda, mps.")

    try:
        steps = int(steps_raw)
    except ValueError as error:
        raise RuntimeError("IMAGE_STEPS deve ser inteiro.") from error

    try:
        guidance_scale = float(guidance_raw)
    except ValueError as error:
        raise RuntimeError("IMAGE_GUIDANCE_SCALE deve ser numerico.") from error

    try:
        width = int(width_raw)
        height = int(height_raw)
    except ValueError as error:
        raise RuntimeError("IMAGE_WIDTH e IMAGE_HEIGHT devem ser inteiros.") from error

    try:
        ip_scale = float(ip_scale_raw)
    except ValueError as error:
        raise RuntimeError("IMAGE_IP_ADAPTER_SCALE deve ser numerico.") from error

    config = RuntimeConfig(
        image_backend=backend,
        image_model_id=model_id,
        image_device=device,
        image_steps=steps,
        image_guidance_scale=guidance_scale,
        image_width=width,
        image_height=height,
        image_ip_adapter_repo=ip_repo,
        image_ip_adapter_subfolder=ip_subfolder,
        image_ip_adapter_weight=ip_weight,
        image_ip_adapter_scale=ip_scale,
    )

    if config.image_backend == "real":
        try:
            from PIL import Image, ImageDraw  # noqa: F401
        except ImportError as error:
            raise RuntimeError(
                "Backend real requer Pillow instalado no image-service."
            ) from error

    if config.image_backend == "ipadapter":
        if not config.image_ip_adapter_weight:
            raise RuntimeError("IMAGE_IP_ADAPTER_WEIGHT e obrigatorio no backend ipadapter.")

        try:
            import torch  # noqa: F401
            from diffusers import AutoPipelineForText2Image  # noqa: F401
        except ImportError as error:
            raise RuntimeError(
                "Backend ipadapter requer torch e diffusers instalados no image-service."
            ) from error

    return config


RUNTIME_CONFIG = _load_runtime_config()
IPADAPTER_PIPELINE = None


class ImageGenerateInput(BaseModel):
    scene: str = Field(min_length=3)
    mood: str = Field(min_length=2)
    variation_level: float = Field(ge=0.0, le=1.0)
    force_partial_failure_at: int | None = Field(default=None, ge=1, le=3)


class ImageItem(BaseModel):
    image_path: str
    prompt_used: str
    seed: int
    generation_time_ms: int
    width: int
    height: int


class ImageGenerateResponse(BaseModel):
    status: Literal["success", "partial"]
    model: str
    partial_reason: str | None = None
    total_generation_time_ms: int
    items: list[ImageItem]


def _references_available() -> bool:
    if not REFERENCES_DIR.exists() or not REFERENCES_DIR.is_dir():
        return False
    return any(_reference_files())


def _reference_files() -> list[Path]:
    if not REFERENCES_DIR.exists() or not REFERENCES_DIR.is_dir():
        return []

    allowed = {".png", ".jpg", ".jpeg", ".webp"}
    files = [
        p
        for p in REFERENCES_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in allowed and p.name.lower() != "readme.md"
    ]
    return sorted(files)


def _build_prompt(scene: str, mood: str, variation_level: float, seed: int) -> str:
    return (
        f"Heroi estoico em dark fantasy. Cena: {scene}. Humor: {mood}. "
        f"Variation level: {variation_level:.2f}. Seed: {seed}."
    )


def _render_placeholder_image(file_path: Path, prompt: str) -> None:
    # Placeholder textual para MVP local sem acoplar biblioteca de imagem.
    file_path.write_text(prompt, encoding="utf-8")


def _render_real_image(file_path: Path, prompt: str, seed: int) -> None:
    from PIL import Image, ImageDraw

    image = Image.new("RGB", (1080, 1920), color=(18, 18, 22))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1079, 260), fill=(30, 30, 36))
    draw.text((24, 24), "Stoic Hero Render", fill=(220, 220, 220))
    draw.text((24, 80), f"model: {RUNTIME_CONFIG.image_model_id}", fill=(180, 180, 180))
    draw.text((24, 120), f"device: {RUNTIME_CONFIG.image_device}", fill=(180, 180, 180))
    draw.text((24, 160), f"steps: {RUNTIME_CONFIG.image_steps}", fill=(180, 180, 180))
    draw.text((24, 200), f"seed: {seed}", fill=(180, 180, 180))

    text = prompt[:280]
    draw.text((24, 320), text, fill=(210, 210, 210))
    image.save(file_path, format="PNG")


def _get_ipadapter_pipeline():
    global IPADAPTER_PIPELINE
    if IPADAPTER_PIPELINE is not None:
        return IPADAPTER_PIPELINE

    import torch
    from diffusers import AutoPipelineForText2Image

    dtype = torch.float16 if RUNTIME_CONFIG.image_device in {"cuda", "mps"} else torch.float32
    pipeline = AutoPipelineForText2Image.from_pretrained(
        RUNTIME_CONFIG.image_model_id,
        torch_dtype=dtype,
    )

    if RUNTIME_CONFIG.image_device == "cpu":
        pipeline = pipeline.to("cpu")
    else:
        pipeline = pipeline.to(RUNTIME_CONFIG.image_device)

    pipeline.load_ip_adapter(
        RUNTIME_CONFIG.image_ip_adapter_repo,
        subfolder=RUNTIME_CONFIG.image_ip_adapter_subfolder,
        weight_name=RUNTIME_CONFIG.image_ip_adapter_weight,
    )
    pipeline.set_ip_adapter_scale(RUNTIME_CONFIG.image_ip_adapter_scale)

    IPADAPTER_PIPELINE = pipeline
    return pipeline


def _render_ipadapter_image(file_path: Path, prompt: str, seed: int, reference_path: Path) -> None:
    import torch
    from PIL import Image

    pipeline = _get_ipadapter_pipeline()
    reference = Image.open(reference_path).convert("RGB")

    generator_device = "cpu" if RUNTIME_CONFIG.image_device == "cpu" else RUNTIME_CONFIG.image_device
    generator = torch.Generator(device=generator_device).manual_seed(seed)

    image = pipeline(
        prompt=prompt,
        negative_prompt="lowres, blurry, bad anatomy, worst quality",
        num_inference_steps=RUNTIME_CONFIG.image_steps,
        guidance_scale=RUNTIME_CONFIG.image_guidance_scale,
        width=RUNTIME_CONFIG.image_width,
        height=RUNTIME_CONFIG.image_height,
        ip_adapter_image=reference,
        generator=generator,
    ).images[0]

    image.save(file_path, format="PNG")


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "references_dir": str(REFERENCES_DIR),
        "image_backend": RUNTIME_CONFIG.image_backend,
        "image_model_id": RUNTIME_CONFIG.image_model_id,
        "image_device": RUNTIME_CONFIG.image_device,
        "image_width": RUNTIME_CONFIG.image_width,
        "image_height": RUNTIME_CONFIG.image_height,
    }


@app.post("/generate-images", response_model=ImageGenerateResponse)
async def generate_images(payload: ImageGenerateInput) -> ImageGenerateResponse:
    if not _references_available():
        raise HTTPException(
            status_code=422,
            detail="Diretorio de referencias do heroi vazio, ausente ou inacessivel.",
        )

    total_start = time.perf_counter()
    results: list[ImageItem] = []
    partial_reason = None
    references = _reference_files()

    for index in range(3):
        if payload.force_partial_failure_at and payload.force_partial_failure_at == index + 1:
            partial_reason = f"Falha simulada na imagem {index + 1}."
            break

        step_start = time.perf_counter()
        seed = random.randint(1, 2_147_483_647)
        prompt = _build_prompt(payload.scene, payload.mood, payload.variation_level, seed)

        file_name = f"img_{int(time.time())}_{index + 1}_{seed}.png"
        file_path = IMAGE_OUTPUT_DIR / file_name
        try:
            if RUNTIME_CONFIG.image_backend == "mock":
                _render_placeholder_image(file_path, prompt)
            elif RUNTIME_CONFIG.image_backend == "real":
                _render_real_image(file_path, prompt, seed)
            else:
                reference = references[index % len(references)]
                _render_ipadapter_image(file_path, prompt, seed, reference)
        except Exception as error:  # pragma: no cover - falhas de backend externo
            partial_reason = f"Falha no backend de imagem: {error}"
            break

        duration_ms = int((time.perf_counter() - step_start) * 1000)
        results.append(
            ImageItem(
                image_path=str(file_path),
                prompt_used=prompt,
                seed=seed,
                generation_time_ms=duration_ms,
                width=RUNTIME_CONFIG.image_width,
                height=RUNTIME_CONFIG.image_height,
            )
        )

    status: Literal["success", "partial"] = "success"
    if len(results) < 3:
        status = "partial"

    total_generation_time_ms = int((time.perf_counter() - total_start) * 1000)

    return ImageGenerateResponse(
        status=status,
        model=RUNTIME_CONFIG.image_model_id,
        partial_reason=partial_reason,
        total_generation_time_ms=total_generation_time_ms,
        items=results,
    )
