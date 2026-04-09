from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "image_backend" in response.json()
    assert "image_model_id" in response.json()


def test_generate_images_requires_references(tmp_path: Path, monkeypatch) -> None:
    empty_refs = tmp_path / "refs"
    empty_refs.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("HERO_REFERENCES_DIR", str(empty_refs))

    # Import tardio para respeitar env no processo de teste.
    from app import main  # pylint: disable=import-outside-toplevel

    main.REFERENCES_DIR = empty_refs

    response = client.post(
        "/generate-images",
        json={"scene": "campo", "mood": "sombrio", "variation_level": 0.4},
    )
    assert response.status_code == 422


def test_generate_images_contract(tmp_path: Path, monkeypatch) -> None:
    refs = tmp_path / "refs"
    refs.mkdir(parents=True, exist_ok=True)
    (refs / "hero.jpg").write_bytes(b"fake-image")

    out = tmp_path / "out"
    out.mkdir(parents=True, exist_ok=True)

    from app import main  # pylint: disable=import-outside-toplevel

    main.REFERENCES_DIR = refs
    main.IMAGE_OUTPUT_DIR = out

    response = client.post(
        "/generate-images",
        json={"scene": "ruinas", "mood": "tenso", "variation_level": 0.7},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert len(payload["items"]) == 3
    for item in payload["items"]:
        assert "image_path" in item
        assert "prompt_used" in item
        assert "seed" in item
        assert "generation_time_ms" in item


def test_runtime_config_validation_invalid_backend(monkeypatch) -> None:
    monkeypatch.setenv("IMAGE_BACKEND", "invalid")

    from app import main  # pylint: disable=import-outside-toplevel

    try:
        main._load_runtime_config()
        assert False, "Era esperado erro de validacao para IMAGE_BACKEND invalido"
    except RuntimeError as error:
        assert "IMAGE_BACKEND invalido" in str(error)


def test_runtime_config_validation_ipadapter_requires_weight(monkeypatch) -> None:
    monkeypatch.setenv("IMAGE_BACKEND", "ipadapter")
    monkeypatch.setenv("IMAGE_IP_ADAPTER_WEIGHT", "")

    from app import main  # pylint: disable=import-outside-toplevel

    try:
        main._load_runtime_config()
        assert False, "Era esperado erro para IMAGE_IP_ADAPTER_WEIGHT vazio"
    except RuntimeError as error:
        assert "IMAGE_IP_ADAPTER_WEIGHT" in str(error)


def test_generate_images_contract_real_backend(tmp_path: Path, monkeypatch) -> None:
    refs = tmp_path / "refs"
    refs.mkdir(parents=True, exist_ok=True)
    (refs / "hero.jpg").write_bytes(b"fake-image")

    out = tmp_path / "out"
    out.mkdir(parents=True, exist_ok=True)

    from app import main  # pylint: disable=import-outside-toplevel

    monkeypatch.setenv("IMAGE_BACKEND", "real")
    monkeypatch.setenv("IMAGE_MODEL_ID", "sdxl-test")
    monkeypatch.setenv("IMAGE_DEVICE", "cpu")
    monkeypatch.setenv("IMAGE_STEPS", "25")
    monkeypatch.setenv("IMAGE_GUIDANCE_SCALE", "6.5")

    main.RUNTIME_CONFIG = main._load_runtime_config()
    main.REFERENCES_DIR = refs
    main.IMAGE_OUTPUT_DIR = out

    response = client.post(
        "/generate-images",
        json={"scene": "fortaleza", "mood": "epico", "variation_level": 0.6},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "sdxl-test"
    assert payload["status"] == "success"
    for item in payload["items"]:
        image_path = Path(item["image_path"])
        assert image_path.suffix == ".png"
        assert image_path.exists()
