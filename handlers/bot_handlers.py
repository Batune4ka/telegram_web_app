from aiogram import Router, Bot, types
from aiogram.filters import Command
from database.bot_storage import BotStorage
from services.bot_generator import BotGenerator
import json

router = Router()
bot_storage = BotStorage()
bot_generator = BotGenerator()

@router.post('/api/bots')
async def save_bot(request: types.WebAppData):
    try:
        user_id = request.user.id
        schema = request.json['schema']
        
        # Сохраняем схему бота
        await bot_storage.save_bot(user_id, schema)
        
        return types.Response(status=200)
    except Exception as e:
        print(f"Ошибка сохранения бота: {e}")
        return types.Response(status=500)

@router.post('/api/test-bot')
async def test_bot(request: types.WebAppData):
    try:
        user_id = request.user.id
        schema = request.json['schema']
        bot_token = request.json['token']
        bot_name = request.json['name']
        
        # Проверяем токен
        try:
            test_bot = Bot(token=bot_token)
            bot_info = await test_bot.get_me()
            await test_bot.close()
        except Exception as e:
            return types.Response(
                status=400,
                content_type='application/json',
                text=json.dumps({'error': 'Неверный токен бота'})
            )
        
        # Генерируем и запускаем бота
        bot_token = await bot_generator.create_test_bot(schema, bot_token)
        
        # Сохраняем бота в базу
        await bot_storage.save_bot(user_id, schema, bot_name)
        
        return types.Response(
            status=200,
            content_type='application/json',
            text=json.dumps({'success': True})
        )
    except Exception as e:
        print(f"Ошибка тестирования бота: {e}")
        return types.Response(status=500)

@router.get('/api/bots')
async def get_user_bots(request: types.WebAppData):
    try:
        user_id = request.user.id
        bots = await bot_storage.get_user_bots(user_id)
        
        return types.Response(
            status=200,
            content_type='application/json',
            text=json.dumps(bots)
        )
    except Exception as e:
        print(f"Ошибка получения ботов: {e}")
        return types.Response(status=500) 