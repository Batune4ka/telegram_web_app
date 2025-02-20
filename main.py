import asyncio
import logging
from aiogram import Bot, Dispatcher
from config.config import config
from handlers import user_handlers

async def main():
    logging.basicConfig(level=logging.INFO)
    
    bot = Bot(token=config.BOT_TOKEN)
    dp = Dispatcher()
    
    # Регистрация хендлеров
    dp.include_router(user_handlers.router)
    
    # Запуск бота
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main()) 