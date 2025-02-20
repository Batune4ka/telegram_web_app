import sqlite3
from datetime import datetime

class Database:
    def __init__(self, db_file):
        self.connection = sqlite3.connect(db_file)
        self.cursor = self.connection.cursor()
        self.create_tables()
    
    def create_tables(self):
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            telegram_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            registered_at TIMESTAMP
        )
        ''')
        self.connection.commit()
    
    def add_user(self, telegram_id, username, first_name, last_name):
        with self.connection:
            return self.cursor.execute(
                "INSERT OR IGNORE INTO users (telegram_id, username, first_name, last_name, registered_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (telegram_id, username, first_name, last_name, datetime.now())
            )
    
    def user_exists(self, telegram_id):
        result = self.cursor.execute("SELECT 1 FROM users WHERE telegram_id = ?", (telegram_id,))
        return bool(len(result.fetchall())) 