// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;

// Расширяем окно на весь экран
tg.expand();

// Устанавливаем основной цвет
tg.MainButton.setParams({
    text: 'Закрыть приложение',
    color: '#2481db'
});

// Основная логика приложения
document.addEventListener('DOMContentLoaded', function() {
    console.log('Приложение загружено');
    
    // Скрываем загрузку
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // Проверяем инициализацию WebApp
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        console.log('Пользователь авторизован:', tg.initDataUnsafe.user);
        showAuthorizedUI(tg.initDataUnsafe.user);
    } else {
        console.log('Требуется авторизация через Telegram');
        showUnauthorizedUI();
    }
});

// Показать интерфейс для неавторизованного пользователя
function showUnauthorizedUI() {
    document.getElementById('welcomeText').style.display = 'block';
    document.getElementById('profileInfo').style.display = 'none';
    document.getElementById('authButton').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
}

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
    try {
        const data = {
            type: 'auth',
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name
            }
        };
        console.log('Отправка данных в бот:', data);
        tg.sendData(JSON.stringify(data));
    } catch (error) {
        console.error('Ошибка при отправке данных:', error);
    }
}

// Обработчик кнопки авторизации
document.getElementById('authButton').addEventListener('click', function() {
    if (!window.Telegram.WebApp.initDataUnsafe.user) {
        // Показываем сообщение только если открыто не в Telegram
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
        `;
        message.innerHTML = `
            <h3 style="margin-bottom: 10px;">Это приложение доступно только через Telegram</h3>
            <p>Пожалуйста, откройте бота в Telegram и нажмите кнопку "Открыть приложение"</p>
        `;
        document.body.appendChild(message);
        
        // Удаляем сообщение через 3 секунды
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
});

// Обработка закрытия приложения
tg.onEvent('mainButtonClicked', function() {
    tg.close();
}); 