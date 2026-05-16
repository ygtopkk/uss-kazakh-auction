import asyncio
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv
from .database import get_supabase

load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")
FRONTEND_URL = os.getenv("FRONTEND_URL")

bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def start_handler(message: types.Message):
    tg_id = message.from_user.id
    username = message.from_user.username or message.from_user.first_name
    
    # Register user in Supabase
    supabase = get_supabase()
    
    # Check if user exists
    user_res = supabase.table("users").select("*").eq("tg_id", tg_id).execute()
    
    if not user_res.data:
        # Create user
        supabase.table("users").insert({
            "tg_id": tg_id,
            "username": username,
            "role": "user"
        }).execute()
    
    # Welcome message with WebApp button
    welcome_text = (
        f"Привет, {username}! 👋\n\n"
        "Добро пожаловать на аукцион USS Kazakh. "
        "Здесь вы можете участвовать в торгах на эксклюзивные автомобили.\n\n"
        "Нажмите кнопку ниже, чтобы открыть текущий аукцион."
    )
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="Открыть аукцион 🚗", 
            web_app=WebAppInfo(url=FRONTEND_URL)
        )]
    ])
    
    await message.answer(welcome_text, reply_markup=keyboard)

async def main():
    print("Bot is starting...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
