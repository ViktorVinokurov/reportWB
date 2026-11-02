#!/bin/sh
set -eu

cd /app

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Импорт из WB API ждёт ответа до минуты на страницу и паузу между страницами,
# поэтому таймаут воркера больше стандартных 30 с.
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --threads 4 \
  --timeout 300 \
  --access-logfile - \
  --error-logfile -
