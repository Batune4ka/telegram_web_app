import asyncio
import logging
from aiogram import Bot, Dispatcher
from config.config import config
from handlers import user_handlers, bot_handlers
import os
from aiohttp import web
from dotenv import load_dotenv

load_dotenv()

async def main():
    logging.basicConfig(level=logging.INFO)
    
    # Инициализация бота
    bot = Bot(token=os.getenv('BOT_TOKEN'))
    dp = Dispatcher()

    # Инициализация хранилища ботов
    await bot_handlers.init_bot_storage()

    # Регистрация роутеров
    dp.include_router(bot_handlers.router)
    
    # Настройка веб-сервера
    app = web.Application()
    app.router.add_routes(bot_handlers.router)

    # Запуск веб-сервера
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8000)
    await site.start()

    # Запуск бота
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main()) 