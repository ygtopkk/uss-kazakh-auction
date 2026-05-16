web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
bot: python3 -m bot.main
admin_bot: python3 -m admin_bot.main
frontend: cd frontend && npm run preview -- --host 0.0.0.0 --port $PORT
admin: cd admin_panel && npm run preview -- --host 0.0.0.0 --port $PORT
