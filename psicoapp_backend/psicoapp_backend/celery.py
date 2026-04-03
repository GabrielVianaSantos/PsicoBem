import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "psicoapp_backend.settings")

app = Celery("psicoapp_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

