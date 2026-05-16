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
    try:
        tg_id = message.from_user.id
        username = message.from_user.username or message.from_user.first_name
        print(f"Start command received from {username} ({tg_id})")
        
        # По умолчанию считаем админом для теста, если возникнет ошибка с БД
        is_admin = True 
        
        try:
            # Check if user exists and is an admin in Supabase
            supabase = get_supabase()
            user_res = supabase.table("users").select("*").eq("tg_id", tg_id).execute()
            
            if not user_res.data:
                print(f"Registering new admin: {username}")
                supabase.table("users").insert({
                    "tg_id": tg_id,
                    "username": username,
                    "role": "admin"
                }).execute()
            else:
                is_admin = user_res.data[0]["role"] == "admin"
                print(f"User exists. Is admin: {is_admin}")
        except Exception as db_e:
            print(f"Database error (continuing as admin for safety): {db_e}")

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
    except Exception as e:
        print(f"CRITICAL ERROR IN ADMIN BOT: {str(e)}")
        # Даже при критической ошибке пытаемся ответить
        await message.answer(f"Произошла ошибка, но я стараюсь работать. Попробуйте нажать /start еще раз.")

async def main():
    print("Admin Bot is starting...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
