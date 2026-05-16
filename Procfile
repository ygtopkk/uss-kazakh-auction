web: gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
bot: python -m bot.main
admin_bot: python -m admin_bot.main
frontend: cd frontend && npm run build && npm run preview -- --host 0.0.0.0 --port $PORT
admin: cd admin_panel && npm run build && npm run preview -- --host 0.0.0.0 --port $PORT
