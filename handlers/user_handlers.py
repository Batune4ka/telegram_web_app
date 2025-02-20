from aiogram import Router, types
from aiogram.filters import Command
from keyboards.web_app_keyboards import get_webapp_keyboard

router = Router()

@router.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(
        "Привет! Нажми на кнопку ниже, чтобы открыть веб-приложение",
        reply_markup=get_webapp_keyboard()
    )

@router.message()
async def handle_web_app_data(message: types.Message):
    if message.web_app_data:
        # Обработка данных от веб-приложения
        await message.answer(f"Получены данные от веб-приложения: {message.web_app_data.data}") 