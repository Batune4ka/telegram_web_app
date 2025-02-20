from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

# Перейти в директорию с веб-файлами
os.chdir('web')

# Запустить простой веб-сервер
httpd = HTTPServer(('localhost', 8000), SimpleHTTPRequestHandler)
print("Сервер запущен на http://localhost:8000")
httpd.serve_forever()
