class Profile {
    constructor() {
        this.initTheme();
        this.initEventListeners();
        this.loadUserData();
    }

    initTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        themeToggle.innerHTML = savedTheme === 'light' ? 
            '<i class="fas fa-moon"></i>' : 
            '<i class="fas fa-sun"></i>';

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            themeToggle.innerHTML = newTheme === 'light' ? 
                '<i class="fas fa-moon"></i>' : 
                '<i class="fas fa-sun"></i>';
        });

        // Обработчики для кнопок выбора темы
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const theme = btn.dataset.theme;
                if (theme === 'system') {
                    // Определяем системную тему
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                } else {
                    document.documentElement.setAttribute('data-theme', theme);
                }
                localStorage.setItem('theme', theme);
            });
        });
    }

    initEventListeners() {
        // Обработчик для изменения аватара
        const avatarBtn = document.querySelector('.edit-avatar-btn');
        if (avatarBtn) {
            avatarBtn.addEventListener('click', () => {
                // Здесь будет логика загрузки аватара
                console.log('Изменение аватара');
            });
        }

        // Обработчик для изменения обложки
        const coverBtn = document.querySelector('.edit-cover-btn');
        if (coverBtn) {
            coverBtn.addEventListener('click', () => {
                // Здесь будет логика загрузки обложки
                console.log('Изменение обложки');
            });
        }

        // Обработчик для кнопки удаления аккаунта
        const deleteBtn = document.querySelector('.btn-danger');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.')) {
                    // Здесь будет логика удаления аккаунта
                    console.log('Удаление аккаунта');
                }
            });
        }

        // Сохранение настроек
        const saveBtn = document.querySelector('.btn-primary');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveUserData();
            });
        }
    }

    loadUserData() {
        // Здесь будет загрузка данных пользователя
        // Временные данные для демонстрации
        const userData = {
            name: 'John Doe',
            username: '@johndoe',
            bio: 'Bot Developer',
            stats: {
                bots: 5,
                users: 1234,
                messages: 5678,
                commands: 42
            }
        };

        // Обновляем информацию на странице
        document.getElementById('userNameLarge').textContent = userData.name;
        document.getElementById('userTag').textContent = userData.username;
        document.getElementById('displayName').value = userData.name;
        document.getElementById('userBio').value = userData.bio;

        document.getElementById('totalBots').textContent = userData.stats.bots;
        document.getElementById('totalUsers').textContent = userData.stats.users;
        document.getElementById('totalMessages').textContent = userData.stats.messages;
        document.getElementById('totalCommands').textContent = userData.stats.commands;
    }

    saveUserData() {
        const displayName = document.getElementById('displayName').value;
        const userBio = document.getElementById('userBio').value;

        // Здесь будет логика сохранения данных
        console.log('Сохранение данных:', { displayName, userBio });

        // Показываем уведомление об успешном сохранении
        this.showNotification('Настройки успешно сохранены');
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.profile = new Profile();
}); 