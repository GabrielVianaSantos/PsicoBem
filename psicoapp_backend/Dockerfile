FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv "$VIRTUAL_ENV"

COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/logs /app/staticfiles

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && gunicorn psicoapp_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --access-logfile /app/logs/gunicorn-access.log --error-logfile /app/logs/gunicorn-error.log"]
