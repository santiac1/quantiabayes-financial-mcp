FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 1. Instalar dependencias (incluyendo libtbb-dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libtbb-dev \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- FIX DE INSTALACIÓN ---
# 2. Instalamos en /opt. Esto creará la carpeta /opt/cmdstan-2.34.1
RUN python3 -m cmdstanpy.install_cmdstan --dir /opt --version 2.34.1

# 3. CREAR ENLACE SIMBÓLICO (El Truco)
# Esto hace que /opt/cmdstan apunte a la carpeta real.
# Así no tenemos problemas de rutas anidadas.
RUN ln -s /opt/cmdstan-2.34.1 /opt/cmdstan

# 4. VARIABLE DE ENTORNO
# Ahora CMDSTAN apunta al enlace simbólico que acabamos de crear
ENV CMDSTAN=/opt/cmdstan

# 5. VERIFICACIÓN
# Ahora sí debería encontrar el archivo binario
RUN ls -la /opt/cmdstan/bin/stanc
# --------------------------

COPY . .

# Permisos para caché
ENV STAN_MODEL_DIR=/app/stan_cache
RUN mkdir -p $STAN_MODEL_DIR
RUN chmod -R 777 $STAN_MODEL_DIR

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]