document.addEventListener('DOMContentLoaded', async () => {
    const tg = window.Telegram.WebApp;
    
    // Загружаем данные пользователя
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        // Обновляем аватар
        const avatarImg = document.getElementById('userAvatar');
        if (user.photo_url) {
            avatarImg.src = user.photo_url;
        } else {
            avatarImg.src = 'https://via.placeholder.com/100?text=' + user.first_name.charAt(0);
        }
        
        // Обновляем имя и username
        document.getElementById('userName').textContent = user.first_name + 
            (user.last_name ? ' ' + user.last_name : '');
        document.getElementById('userUsername').textContent = user.username ? 
            '@' + user.username : 'Нет username';
        
        // Загружаем статистику
        try {
            const response = await fetch(`/api/user/stats?userId=${user.id}`);
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('botsCount').textContent = stats.botsCount;
                document.getElementById('lastActive').textContent = 
                    new Date(stats.lastActive).toLocaleDateString();
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }
}); 