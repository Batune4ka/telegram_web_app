let tg = window.Telegram.WebApp;

tg.expand();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Если пользователь уже авторизован в Telegram WebApp
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
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

    // Отправить данные в бот для сохранения в БД
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
        // Если пользователь не авторизован, показать сообщение
        alert('Пожалуйста, откройте приложение через Telegram');
    }
}); 