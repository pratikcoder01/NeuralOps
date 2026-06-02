# Production Dockerfile supporting multiple execution entrypoints (FastAPI and Celery)
FROM python:3.11-slim as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim as runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY . .

EXPOSE 8001

ENV PORT 8001

# The execution command is overrideable at runtime:
# For FastAPI API server: uvicorn main:app --host 0.0.0.0 --port 8001
# For Celery Worker process: celery -A celery_worker.celery_app worker --loglevel=info
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
