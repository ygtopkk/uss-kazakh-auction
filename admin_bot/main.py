import asyncio
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv
from bot.database import get_supabase # Reusing the database logic

load_dotenv()

TOKEN = os.getenv("ADMIN_BOT_TOKEN")
ADMIN_FRONTEND_URL = os.getenv("ADMIN_FRONTEND_URL")

bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def start_handler(message: types.Message):
    tg_id = message.from_user.id
    username = message.from_user.username or message.from_user.first_name
    
    # Check if user exists and is an admin in Supabase
    supabase = get_supabase()
    user_res = supabase.table("users").select("*").eq("tg_id", tg_id).execute()
    
    if not user_res.data:
        # Register as admin if first time (you might want to change this logic for security)
        supabase.table("users").insert({
            "tg_id": tg_id,
            "username": username,
            "role": "admin"
        }).execute()
        is_admin = True
    else:
        is_admin = user_res.data[0]["role"] == "admin"
    
    if is_admin:
        welcome_text = (
            f"Привет, Админ {username}! 🛠\n\n"
            "Это панель управления аукционом USS Kazakh.\n"
            "Здесь вы можете добавлять новые лоты, следить за ставками и управлять пользователями."
        )
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="Открыть Админ-панель 📊", 
                web_app=WebAppInfo(url=ADMIN_FRONTEND_URL)
            )]
        ])
        
        await message.answer(welcome_text, reply_markup=keyboard)
    else:
        await message.answer("Извините, у вас нет прав доступа к админ-панели.")

async def main():
    print("Admin Bot is starting...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
