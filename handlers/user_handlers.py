from aiogram import Router, types
from aiogram.filters import Command
from keyboards.web_app_keyboards import get_webapp_keyboard
from database.database import Database
import json

router = Router()
db = Database('database/bot.db')

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
async def handle_web_app_data(message: types.Message):
    if message.web_app_data:
        try:
            data = json.loads(message.web_app_data.data)
            if data.get('type') == 'auth':
                user_data = data.get('user')
                if user_data and user_data.get('id'):
                    # Обновляем информацию о пользователе в БД
                    db.add_user(
                        user_data['id'],
                        user_data.get('username'),
                        user_data.get('first_name'),
                        user_data.get('last_name')
                    )
                    await message.answer("Авторизация успешна!")
        except json.JSONDecodeError:
            await message.answer("Получены некорректные данные") 