from dataclasses import dataclass
from os import getenv
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Config:
    BOT_TOKEN: str = getenv('BOT_TOKEN')
    if BOT_TOKEN is None:
        raise ValueError("BOT_TOKEN не найден в .env файле")
    WEB_APP_URL: str = getenv('WEB_APP_URL')

config = Config() 