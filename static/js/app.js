// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;

// Расширяем окно на весь экран
tg.expand();

// Управление темой
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeIcon = document.querySelector('#themeToggle i');
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        themeIcon.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
    }
}

// Переключение темы
document.getElementById('themeToggle').addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
});

// Загрузка сохраненной темы
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

// Функция для проверки существования элемента
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Элемент с id "${id}" не найден`);
        return null;
    }
    return element;
}

// Показать секцию контента
function showSection(sectionId) {
    // Скрываем все секции
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Убираем активный класс со всех пунктов меню
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });

    // Показываем выбранную секцию
    const selectedSection = getElement(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
        // Добавляем анимацию
        selectedSection.classList.remove('fade-in');
        void selectedSection.offsetWidth; // Форсируем перерисовку
        selectedSection.classList.add('fade-in');
    }

    // Добавляем активный класс к выбранному пункту меню
    const selectedMenuItem = document.querySelector(`.menu-item[onclick="showSection('${sectionId}')"]`);
    if (selectedMenuItem) {
        selectedMenuItem.classList.add('active');
    }
}

// Показать интерфейс для авторизованного пользователя
function showAuthorizedUI(user) {
    const authSection = getElement('authSection');
    const mainContent = getElement('mainContent');
    const userProfile = getElement('userProfile');
    const userAvatar = getElement('userAvatar');
    const userName = getElement('userName');

    if (authSection) authSection.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (userProfile) userProfile.style.display = 'flex';

    // Обновляем информацию пользователя
    if (userName) {
        userName.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    }

    if (userAvatar && user.photo_url) {
        userAvatar.src = user.photo_url;
    }

    // Показываем первую секцию по умолчанию
    showSection('create-bot');

    // Отправляем данные в бот
    sendUserDataToBot(user);
}

// Показать интерфейс для неавторизованного пользователя
function showUnauthorizedUI() {
    const authSection = getElement('authSection');
    const mainContent = getElement('mainContent');
    const userProfile = getElement('userProfile');

    if (authSection) authSection.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
    if (userProfile) userProfile.style.display = 'none';
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

// Обработчики форм
document.getElementById('createBotForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const botName = document.getElementById('botName').value;
    const botDescription = document.getElementById('botDescription').value;

    // Здесь будет логика создания бота
    console.log('Создание бота:', { botName, botDescription });
});

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Скрываем загрузку
    const loading = getElement('loading');
    const app = getElement('app');
    
    if (loading) loading.style.display = 'none';
    if (app) app.style.display = 'block';

    // Проверяем авторизацию
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        console.log('Пользователь авторизован:', tg.initDataUnsafe.user);
        showAuthorizedUI(tg.initDataUnsafe.user);
    } else {
        console.log('Требуется авторизация');
        showUnauthorizedUI();
    }
});

// Обработка кнопки авторизации
document.getElementById('authButton')?.addEventListener('click', function() {
    if (!tg.initDataUnsafe.user) {
        showNotification('Это приложение доступно только через Telegram', 'error');
    }
});

// Показ уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} fade-in`;
    notification.innerHTML = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Обработка закрытия приложения
tg.onEvent('mainButtonClicked', function() {
    tg.close();
});

// Инициализация разделов
function initializeSections() {
    // Создание бота
    const createBotSection = getElement('create-bot');
    if (createBotSection) {
        createBotSection.innerHTML = `
            <h2>Создание бота</h2>
            <div class="section-content">
                <form class="bot-creation-form">
                    <div class="form-group">
                        <label for="botName">Имя бота</label>
                        <input type="text" id="botName" placeholder="Например: MyAwesomeBot">
                    </div>
                    <div class="form-group">
                        <label for="botDescription">Описание бота</label>
                        <textarea id="botDescription" placeholder="Опишите функционал вашего бота"></textarea>
                    </div>
                    <button type="submit" class="primary-button">Создать бота</button>
                </form>
            </div>
        `;
    }

    // Профиль
    const profileSection = getElement('profile');
    if (profileSection) {
        profileSection.innerHTML = `
            <h2>Мой профиль</h2>
            <div class="section-content profile-content">
                <div class="profile-stats">
                    <div class="stat-item">
                        <i class="fas fa-robot"></i>
                        <h3>Мои боты</h3>
                        <p>0 ботов</p>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-calendar"></i>
                        <h3>Дата регистрации</h3>
                        <p>${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Поддержка
    const supportSection = getElement('support');
    if (supportSection) {
        supportSection.innerHTML = `
            <h2>Поддержка</h2>
            <div class="section-content">
                <div class="support-options">
                    <a href="https://t.me/support" class="support-option">
                        <i class="fab fa-telegram"></i>
                        <h3>Telegram Support</h3>
                        <p>Свяжитесь с нами в Telegram</p>
                    </a>
                    <div class="support-option" onclick="showFAQ()">
                        <i class="fas fa-question-circle"></i>
                        <h3>FAQ</h3>
                        <p>Часто задаваемые вопросы</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Обновления
    const updatesSection = getElement('updates');
    if (updatesSection) {
        updatesSection.innerHTML = `
            <h2>Обновления</h2>
            <div class="section-content">
                <div class="update-list">
                    <div class="update-item">
                        <div class="update-date">21.03.2024</div>
                        <h3>Версия 1.0.0</h3>
                        <ul>
                            <li>Запуск платформы</li>
                            <li>Добавлено создание ботов</li>
                            <li>Добавлен личный кабинет</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
}

// Добавим немного CSS стилей динамически
const style = document.createElement('style');
style.textContent = `
    .bot-creation-form {
        max-width: 600px;
        margin: 0 auto;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        margin-bottom: 8px;
        color: #333;
        font-weight: 500;
    }

    .form-group input,
    .form-group textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
    }

    .form-group textarea {
        height: 120px;
        resize: vertical;
    }

    .primary-button {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s ease;
    }

    .primary-button:hover {
        background: var(--secondary-color);
    }

    .profile-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }

    .stat-item {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
    }

    .stat-item i {
        font-size: 24px;
        color: var(--primary-color);
        margin-bottom: 10px;
    }

    .support-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
    }

    .support-option {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        color: inherit;
    }

    .support-option:hover {
        transform: translateY(-5px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .update-list {
        max-width: 800px;
        margin: 0 auto;
    }

    .update-item {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
    }

    .update-date {
        color: #666;
        font-size: 14px;
        margin-bottom: 10px;
    }

    .update-item ul {
        margin-top: 10px;
        padding-left: 20px;
    }

    .update-item li {
        margin-bottom: 5px;
        color: #666;
    }

    @media (max-width: 768px) {
        .profile-stats,
        .support-options {
            grid-template-columns: 1fr;
        }
    }
`;

document.head.appendChild(style); 