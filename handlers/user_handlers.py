from aiogram import Router, types
from aiogram.filters import Command
from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, WebAppInfo
from keyboards.web_app_keyboards import get_webapp_keyboard
from database.database import Database
import json
from config.config import config

router = Router()
db = Database('database/bot.db')

def get_webapp_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(
                text="Открыть приложение", 
                web_app=WebAppInfo(url=config.WEB_APP_URL)
            )]
        ],
        resize_keyboard=True,
        is_persistent=True
    )

@router.message(Command("start"))
async def cmd_start(message: types.Message):
    if not db.user_exists(message.from_user.id):
        db.add_user(
            message.from_user.id,
            message.from_user.username,
            message.from_user.first_name,
            message.from_user.last_name
        )
    
    await message.answer(
        "Привет! Нажми на кнопку ниже, чтобы открыть веб-приложение",
        reply_markup=get_webapp_keyboard()
    )

@router.message()
async def handle_webapp_data(message: types.Message):
    if message.web_app_data:
        try:
            print(f"Получены данные: {message.web_app_data.data}")
            await message.answer("Данные получены!")
        except Exception as e:
            print(f"Ошибка: {e}")
            await message.answer("Произошла ошибка при обработке данных") 