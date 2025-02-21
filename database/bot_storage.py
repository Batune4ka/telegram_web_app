import aiosqlite
import json
from datetime import datetime

class BotStorage:
    def __init__(self, db_path="database/bots.db"):
        self.db_path = db_path

    @classmethod
    async def create(cls, db_path="database/bots.db"):
        """Фабричный метод для создания экземпляра класса"""
        self = cls(db_path)
        await self._init_db()
        return self

    async def _init_db(self):
        """Инициализация базы данных"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute('''
                CREATE TABLE IF NOT EXISTS bots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    schema TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await db.commit()

    async def save_bot(self, user_id: int, schema: dict, name: str = None):
        """Сохранение бота в базу данных"""
        if name is None:
            name = f"Bot_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        schema_json = json.dumps(schema)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute('''
                INSERT INTO bots (user_id, name, schema)
                VALUES (?, ?, ?)
            ''', (user_id, name, schema_json))
            await db.commit()

    async def get_user_bots(self, user_id: int):
        """Получение всех ботов пользователя"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute('''
                SELECT id, name, schema, created_at, updated_at
                FROM bots
                WHERE user_id = ?
                ORDER BY updated_at DESC
            ''', (user_id,)) as cursor:
                bots = await cursor.fetchall()

        return [
            {
                'id': bot[0],
                'name': bot[1],
                'schema': json.loads(bot[2]),
                'created_at': bot[3],
                'updated_at': bot[4]
            }
            for bot in bots
        ]

    async def update_bot(self, bot_id: int, schema: dict):
        """Обновление схемы бота"""
        schema_json = json.dumps(schema)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute('''
                UPDATE bots
                SET schema = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (schema_json, bot_id))
            await db.commit()

    async def delete_bot(self, bot_id: int):
        """Удаление бота"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute('DELETE FROM bots WHERE id = ?', (bot_id,))
            await db.commit() 