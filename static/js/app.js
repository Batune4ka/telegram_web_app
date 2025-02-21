// Проверяем окружение Telegram
let tg = window.Telegram.WebApp;

// Расширяем окно на весь экран
tg.expand();

// Основная логика приложения
document.addEventListener('DOMContentLoaded', function() {
    // Скрываем загрузку
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // Проверяем, открыто ли приложение в Telegram
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        // Если да - сразу показываем авторизованный интерфейс
        showAuthorizedUI(tg.initDataUnsafe.user);
    }
});

// Показать интерфейс для авторизованного пользователя
function showAuthorizedUI(user) {
    document.getElementById('welcomeText').style.display = 'none';
    document.getElementById('profileInfo').style.display = 'block';
    document.getElementById('authButton').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';

    // Установить данные пользователя
    document.getElementById('userName').textContent = user.first_name + 
        (user.last_name ? ' ' + user.last_name : '');

    // Если есть фото профиля
    if (user.photo_url) {
        const avatar = document.getElementById('userAvatar');
        avatar.style.backgroundImage = `url(${user.photo_url})`;
        avatar.style.backgroundSize = 'cover';
    }

    // Отправить данные в бот
    sendUserDataToBot(user);
}

// Отправка данных пользователя в бот
function sendUserDataToBot(user) {
    const data = {
        type: 'auth',
        user: {
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name
        }
    };
    tg.sendData(JSON.stringify(data));
}

// Обработчик кнопки авторизации
document.getElementById('authButton').addEventListener('click', function() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        showAuthorizedUI(tg.initDataUnsafe.user);
    } else {
        // Показываем сообщение только если открыто не в Telegram
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Roboto, sans-serif;">' +
            '<h3 style="color: #333;">Это приложение доступно только через Telegram</h3>' +
            '<p style="color: #666; margin-top: 10px;">Пожалуйста, откройте бота в Telegram и нажмите кнопку "Открыть приложение"</p>' +
            '</div>';
    }
}); 