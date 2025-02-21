// Проверка инициализации Telegram WebApp
if (!window.Telegram.WebApp) {
    console.error('Telegram WebApp не инициализирован');
    document.body.innerHTML = 'Пожалуйста, откройте приложение через Telegram';
} else {
    let tg = window.Telegram.WebApp;
    
    // Логирование для отладки
    console.log('Telegram WebApp инициализирован');
    console.log('InitData:', tg.initData);
    console.log('User:', tg.initDataUnsafe?.user);

    // Расширяем окно
    tg.expand();

    // Инициализация при загрузке страницы
    document.addEventListener('DOMContentLoaded', function() {
        // Скрываем загрузку и показываем приложение
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';

        // Если пользователь уже авторизован
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            console.log('Пользователь авторизован:', tg.initDataUnsafe.user);
            showAuthorizedUI(tg.initDataUnsafe.user);
        } else {
            console.log('Пользователь не авторизован');
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
        console.log('Нажата кнопка авторизации');
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            console.log('Авторизация через кнопку:', tg.initDataUnsafe.user);
            showAuthorizedUI(tg.initDataUnsafe.user);
        } else {
            console.log('Пользователь не авторизован при нажатии кнопки');
            alert('Пожалуйста, откройте приложение через Telegram');
        }
    });
} 