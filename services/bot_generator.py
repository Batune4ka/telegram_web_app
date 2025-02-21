import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
import json
import os
from datetime import datetime

class BotGenerator:
    def __init__(self):
        self.test_bots = {}  # Хранение тестовых ботов

    async def create_test_bot(self, schema):
        """Создает тестового бота на основе схемы"""
        try:
            # Генерируем код бота
            bot_code = self._generate_bot_code(schema)
            
            # Создаем временный файл с кодом бота
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"test_bot_{timestamp}.py"
            
            with open(f"temp_bots/{filename}", "w") as f:
                f.write(bot_code)
            
            # Запускаем бота
            bot_token = os.getenv('TEST_BOT_TOKEN')  # Токен для тестирования
            bot = await self._run_test_bot(filename, bot_token)
            
            return bot_token
            
        except Exception as e:
            print(f"Ошибка создания тестового бота: {e}")
            raise

    def _generate_bot_code(self, schema):
        """Генерирует код бота на основе схемы"""
        code = [
            "from aiogram import Bot, Dispatcher, types",
            "from aiogram.filters import Command",
            "import asyncio",
            "",
            "# Инициализация бота",
            "bot = Bot(token=TOKEN)",
            "dp = Dispatcher()",
            "",
            "# Обработчики команд и сообщений"
        ]

        # Генерируем обработчики для каждого блока
        handlers = self._generate_handlers(schema)
        code.extend(handlers)

        # Добавляем main функцию
        code.extend([
            "",
            "async def main():",
            "    await dp.start_polling(bot)",
            "",
            "if __name__ == '__main__':",
            "    asyncio.run(main())"
        ])

        return "\n".join(code)

    def _generate_handlers(self, schema):
        """Генерирует обработчики на основе схемы"""
        handlers = []
        for block in schema['blocks']:
            if block['type'] == 'command':
                handlers.extend(self._generate_command_handler(block))
            elif block['type'] == 'message':
                handlers.extend(self._generate_message_handler(block))
            elif block['type'] == 'button':
                handlers.extend(self._generate_callback_handler(block))

        return handlers

    def _generate_command_handler(self, block):
        """Генерирует обработчик команды"""
        command = block['properties']['command'].replace('/', '')
        return [
            "",
            f"@dp.message(Command('{command}'))",
            f"async def {command}_handler(message: types.Message):",
            f"    await message.answer('{block['properties'].get('response', 'Command received!')}')"
        ]

    def _generate_message_handler(self, block):
        """Генерирует обработчик сообщения"""
        return [
            "",
            "@dp.message()",
            "async def message_handler(message: types.Message):",
            f"    if '{block['properties'].get('pattern', '')}' in message.text:",
            f"        await message.answer('{block['properties'].get('response', 'Message received!')}')"
        ]

    def _generate_callback_handler(self, block):
        """Генерирует обработчик callback-кнопки"""
        callback_data = block['properties']['callback_data']
        return [
            "",
            f"@dp.callback_query(lambda c: c.data == '{callback_data}')",
            f"async def callback_{callback_data}(callback_query: types.CallbackQuery):",
            "    await callback_query.answer()",
            f"    await callback_query.message.answer('{block['properties'].get('response', 'Button clicked!')}')"
        ]

    async def _run_test_bot(self, filename, token):
        """Запускает тестового бота"""
        try:
            # Импортируем сгенерированный код бота
            import importlib.util
            spec = importlib.util.spec_from_file_location("test_bot", f"temp_bots/{filename}")
            test_bot = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(test_bot)

            # Запускаем бота в отдельном процессе
            process = await asyncio.create_subprocess_exec(
                'python', f'temp_bots/{filename}',
                env={'TOKEN': token}
            )

            # Сохраняем информацию о тестовом боте
            self.test_bots[token] = {
                'process': process,
                'filename': filename,
                'started_at': datetime.now()
            }

            return token

        except Exception as e:
            print(f"Ошибка запуска тестового бота: {e}")
            raise 