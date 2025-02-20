from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, WebAppInfo
from config.config import config

def get_webapp_keyboard():
    web_app = WebAppInfo(url=config.WEB_APP_URL)
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="Открыть веб-приложение", web_app=web_app)]],
        resize_keyboard=True
    ) 