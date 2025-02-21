// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;

// Расширяем окно на весь экран
tg.expand();

// Устанавливаем основной цвет
tg.MainButton.setParams({
    text: 'Закрыть приложение',
    color: '#2481db'
});

// Функция для проверки существования элемента
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Элемент с id "${id}" не найден`);
        return null;
    }
    return element;
}

// Показать интерфейс для неавторизованного пользователя
function showUnauthorizedUI() {
    const welcomeText = getElement('welcomeText');
    const profileInfo = getElement('profileInfo');
    const authButton = getElement('authButton');
    const mainContent = getElement('mainContent');

    if (welcomeText) welcomeText.style.display = 'block';
    if (profileInfo) profileInfo.style.display = 'none';
    if (authButton) authButton.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
}

// Показать интерфейс для авторизованного пользователя
function showAuthorizedUI(user) {
    const welcomeText = getElement('welcomeText');
    const profileInfo = getElement('profileInfo');
    const authButton = getElement('authButton');
    const mainContent = getElement('mainContent');
    const userName = getElement('userName');
    const userAvatar = getElement('userAvatar');

    if (welcomeText) welcomeText.style.display = 'none';
    if (profileInfo) profileInfo.style.display = 'block';
    if (authButton) authButton.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';

    // Установить данные пользователя
    if (userName) {
        userName.textContent = user.first_name + 
            (user.last_name ? ' ' + user.last_name : '');
    }

    // Если есть фото профиля
    if (userAvatar && user.photo_url) {
        userAvatar.style.backgroundImage = `url(${user.photo_url})`;
        userAvatar.style.backgroundSize = 'cover';
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

// Основная логика приложения
document.addEventListener('DOMContentLoaded', function() {
    console.log('Приложение загружено');
    
    // Скрываем загрузку
    const loading = getElement('loading');
    const app = getElement('app');
    
    if (loading) loading.style.display = 'none';
    if (app) app.style.display = 'block';

    // Проверяем инициализацию WebApp
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        console.log('Пользователь авторизован:', tg.initDataUnsafe.user);
        showAuthorizedUI(tg.initDataUnsafe.user);
    } else {
        console.log('Требуется авторизация через Telegram');
        showUnauthorizedUI();
    }

    // Добавляем обработчик для кнопки авторизации
    const authButton = getElement('authButton');
    if (authButton) {
        authButton.addEventListener('click', function() {
            if (!tg.initDataUnsafe.user) {
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
                
                setTimeout(() => {
                    message.remove();
                }, 3000);
            }
        });
    }
});

// Обработка закрытия приложения
tg.onEvent('mainButtonClicked', function() {
    tg.close();
}); 