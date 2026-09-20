"""Runtime AI configuration with workspace .env discovery.

The project-level .env is intentionally outside the application repository.
Loading it here keeps secrets out of source control while allowing local
backend processes to use the API configuration supplied by the product owner.
"""

from __future__ import annotations

import os
from pathlib import Path


def load_workspace_env() -> None:
    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / ".env"
        if not candidate.is_file():
            continue
        for raw_line in candidate.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            if not key or key in os.environ:
                continue
            os.environ[key] = value.strip().strip('"').strip("'")
        break


load_workspace_env()


def ai_api_base() -> str | None:
    if os.getenv("AI_API_BASE"):
        return os.environ["AI_API_BASE"].rstrip("/")
    if os.getenv("DASHSCOPE_API_KEY"):
        return "https://dashscope.aliyuncs.com/compatible-mode/v1"
    return None


def ai_api_key() -> str | None:
    return os.getenv("AI_API_KEY") or os.getenv("DASHSCOPE_API_KEY")


def coach_model() -> str | None:
    return os.getenv("AI_COACH_MODEL") or os.getenv("AI_MODEL") or ("qwen3.7-plus" if os.getenv("DASHSCOPE_API_KEY") else None)


def router_model() -> str | None:
    return os.getenv("AI_ROUTER_MODEL") or ("qwen3.7-flash" if os.getenv("DASHSCOPE_API_KEY") else coach_model())


def ai_provider() -> str:
    return os.getenv("AI_PROVIDER") or ("dashscope" if os.getenv("DASHSCOPE_API_KEY") else "openai-compatible")
