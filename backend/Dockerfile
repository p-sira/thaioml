# Multi-stage build with official Astral uv image
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

WORKDIR /app

# Enable bytecode compilation and copy mode for virtualenv portability
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Install dependencies first (for efficient Docker layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Copy application source and finalize installation
COPY src ./src
COPY README.md ./
RUN uv sync --frozen --no-dev

# Final slim runtime stage
FROM python:3.13-slim-bookworm

WORKDIR /app

# Copy the prepared virtual environment and source code
COPY --from=builder /app/.venv /app/.venv
COPY src ./src

ENV PATH="/app/.venv/bin:$PATH"
ENV PORT=8080

EXPOSE 8080

# Cloud Run injects the PORT environment variable dynamically
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
