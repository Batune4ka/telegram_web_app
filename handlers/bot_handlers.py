from aiogram import Router, Bot, types
from aiogram.filters import Command
from database.bot_storage import BotStorage
from services.bot_generator import BotGenerator
from aiohttp import web
import json

router = web.RouteTableDef()
bot_storage = None  # Инициализируем позже
bot_generator = BotGenerator()

@router.post('/api/bots')
async def save_bot(request: web.Request):
    try:
        data = await request.json()
        user_id = data['user_id']
        schema = data['schema']
        
        # Сохраняем схему бота
        await bot_storage.save_bot(user_id, schema)
        
        return web.Response(status=200)
    except Exception as e:
        print(f"Ошибка сохранения бота: {e}")
        return web.Response(status=500)

@router.post('/api/test-bot')
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

@router.get('/api/bots')
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

async def init_bot_storage():
    global bot_storage
    bot_storage = await BotStorage.create() 