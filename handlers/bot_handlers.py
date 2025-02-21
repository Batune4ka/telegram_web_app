from aiogram import Router, Bot, types
from aiogram.filters import Command
from database.bot_storage import BotStorage
from services.bot_generator import BotGenerator
import json
from aiohttp import web
import os
from dotenv import load_dotenv

load_dotenv()

# Создаем два роутера: для бота и для веб-приложения
bot_router = Router()  # для aiogram
web_routes = web.RouteTableDef()  # для aiohttp

bot_storage = None
bot_generator = BotGenerator()

# Веб-маршруты для API
@web_routes.post('/api/bots')
async def save_bot(request: web.Request):
    try:
        data = await request.json()
        user_id = data['user_id']
        schema = data['schema']
        await bot_storage.save_bot(user_id, schema)
        return web.Response(status=200)
    except Exception as e:
        print(f"Ошибка сохранения бота: {e}")
        return web.Response(status=500)

@web_routes.post('/api/test-bot')
async def test_bot(request: web.Request):
    try:
        data = await request.json()
        user_id = data['user_id']
        schema = data['schema']
        bot_token = data['token']
        bot_name = data['name']
        
        # Проверяем токен
        try:
            test_bot = Bot(token=bot_token)
            bot_info = await test_bot.get_me()
            await test_bot.close()
        except Exception as e:
            return web.Response(
                status=400,
                text=json.dumps({'error': 'Неверный токен бота'}),
                content_type='application/json'
            )
        
        # Генерируем и запускаем бота
        bot_token = await bot_generator.create_test_bot(schema, bot_token)
        
        # Сохраняем бота в базу
        await bot_storage.save_bot(user_id, schema, bot_name)
        
        return web.Response(
            status=200,
            text=json.dumps({'success': True}),
            content_type='application/json'
        )
    except Exception as e:
        print(f"Ошибка тестирования бота: {e}")
        return web.Response(status=500)

@web_routes.get('/api/bots')
async def get_user_bots(request: web.Request):
    try:
        user_id = request.query.get('userId')
        if not user_id:
            return web.Response(status=400)
        
        bots = await bot_storage.get_user_bots(int(user_id))
        return web.Response(
            status=200,
            text=json.dumps(bots),
            content_type='application/json'
        )
    except Exception as e:
        print(f"Ошибка получения ботов: {e}")
        return web.Response(status=500)

# Команды бота
@bot_router.message(Command("start"))
async def cmd_start(message: types.Message):
    # Получаем URL из переменной окружения
    webapp_url = os.getenv('BOT_WEBAPP_URL')
    
    # Создаем кнопку для открытия веб-приложения
    keyboard = types.InlineKeyboardMarkup(
        inline_keyboard=[
            [
                types.InlineKeyboardButton(
                    text="Открыть конструктор", 
                    web_app=types.WebAppInfo(url=webapp_url)
                )
            ]
        ]
    )
    
    await message.answer(
        "Привет! Я бот для создания других ботов. Нажмите кнопку ниже, чтобы открыть конструктор.",
        reply_markup=keyboard
    )

async def init_bot_storage():
    global bot_storage
    bot_storage = await BotStorage.create() 