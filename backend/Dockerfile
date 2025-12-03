FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CMDSTAN=/opt/cmdstan

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend /app

ENV STAN_MODEL_DIR=/app/stan_cache
RUN mkdir -p $STAN_MODEL_DIR

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
