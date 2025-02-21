document.addEventListener('DOMContentLoaded', async () => {
    const tg = window.Telegram.WebApp;
    const botsList = document.getElementById('botsList');
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        try {
            const response = await fetch(`/api/bots?userId=${tg.initDataUnsafe.user.id}`);
            if (response.ok) {
                const bots = await response.json();
                
                if (bots.length === 0) {
                    botsList.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-robot"></i>
                            <p>У вас пока нет ботов</p>
                            <a href="./builder.html" class="btn btn-primary">Создать первого бота</a>
                        </div>
                    `;
                    return;
                }
                
                bots.forEach(bot => {
                    const botCard = document.createElement('div');
                    botCard.className = 'bot-card';
                    botCard.innerHTML = `
                        <div class="bot-info">
                            <h3>${bot.name}</h3>
                            <p class="bot-status ${bot.active ? 'active' : 'inactive'}">
                                ${bot.active ? 'Активен' : 'Неактивен'}
                            </p>
                        </div>
                        <div class="bot-actions">
                            <button class="btn btn-icon" onclick="editBot('${bot.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon" onclick="deleteBot('${bot.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    botsList.appendChild(botCard);
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки ботов:', error);
            botsList.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Ошибка загрузки ботов</p>
                </div>
            `;
        }
    }
});

function editBot(botId) {
    window.location.href = `./builder.html?botId=${botId}`;
}

async function deleteBot(botId) {
    if (!confirm('Вы уверены, что хотите удалить этого бота?')) return;
    
    try {
        const response = await fetch(`/api/bots/${botId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            window.location.reload();
        }
    } catch (error) {
        console.error('Ошибка удаления бота:', error);
        alert('Ошибка удаления бота');
    }
} 