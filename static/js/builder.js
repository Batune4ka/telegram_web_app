class BotBuilder {
    constructor() {
        this.canvas = document.getElementById('builderCanvas');
        this.blocks = new Map();
        this.connections = new Set();
        this.selectedBlock = null;
        this.draggedBlock = null;
        this.offset = { x: 0, y: 0 };
        this.isConnecting = false;
        this.startConnector = null;
        this.userId = null; // ID пользователя из Telegram
        this.botToken = null;
        this.botName = null;
        
        this.initializeEventListeners();
        this.loadUserData();
    }

    initializeEventListeners() {
        // Обработка перетаскивания блоков из сайдбара
        document.querySelectorAll('.block-item').forEach(block => {
            block.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('blockType', block.dataset.blockType);
            });
        });

        // Обработка холста
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const blockType = e.dataTransfer.getData('blockType');
            if (blockType) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.createBlock(blockType, x, y);
            }
        });

        // Обработка перемещения существующих блоков
        document.addEventListener('mousemove', (e) => {
            if (this.draggedBlock) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left - this.offset.x;
                const y = e.clientY - rect.top - this.offset.y;
                
                // Ограничиваем перемещение пределами холста
                const maxX = rect.width - this.draggedBlock.offsetWidth;
                const maxY = rect.height - this.draggedBlock.offsetHeight;
                
                this.draggedBlock.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
                this.draggedBlock.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
                
                // Обновляем соединения
                this.updateConnections();
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.draggedBlock) {
                this.draggedBlock = null;
            }
        });
    }

    async loadUserData() {
        const tg = window.Telegram.WebApp;
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            this.userId = tg.initDataUnsafe.user.id;
            // Загружаем сохраненные боты пользователя
            await this.loadUserBots();
        }
    }

    async loadUserBots() {
        try {
            const response = await fetch(`/api/bots?userId=${this.userId}`);
            const bots = await response.json();
            // Загружаем последний сохраненный бот, если есть
            if (bots.length > 0) {
                this.loadSchema(bots[0].schema);
            }
        } catch (error) {
            console.error('Ошибка загрузки ботов:', error);
        }
    }

    createBlock(type, x, y) {
        const block = document.createElement('div');
        block.className = 'canvas-block';
        block.dataset.blockType = type;
        block.style.left = `${x}px`;
        block.style.top = `${y}px`;

        // Создаем содержимое блока
        const content = this.createBlockContent(type);
        block.appendChild(content);

        // Добавляем коннекторы
        const connectors = this.createConnectors(type);
        connectors.forEach(conn => block.appendChild(conn));

        // Делаем блок перетаскиваемым
        block.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('block-connector')) return;
            
            this.draggedBlock = block;
            const rect = block.getBoundingClientRect();
            this.offset.x = e.clientX - rect.left;
            this.offset.y = e.clientY - rect.top;
            
            // Выбираем блок для редактирования
            this.selectBlock(block);
        });

        this.canvas.appendChild(block);
        
        // Сохраняем данные блока
        this.blocks.set(block.id, {
            element: block,
            type: type,
            properties: this.getDefaultProperties(type),
            connections: {
                inputs: [],
                outputs: []
            }
        });

        return block;
    }

    createBlockContent(type) {
        const content = document.createElement('div');
        content.className = 'block-content';

        const icon = document.createElement('i');
        const title = document.createElement('span');
        
        switch(type) {
            case 'command':
                icon.className = 'fas fa-terminal';
                title.textContent = 'Команда';
                break;
            case 'message':
                icon.className = 'fas fa-comment';
                title.textContent = 'Сообщение';
                break;
            case 'button':
                icon.className = 'fas fa-square';
                title.textContent = 'Кнопка';
                break;
            case 'send-message':
                icon.className = 'fas fa-paper-plane';
                title.textContent = 'Отправить';
                break;
            case 'if':
                icon.className = 'fas fa-code-branch';
                title.textContent = 'Условие';
                break;
            case 'delay':
                icon.className = 'fas fa-clock';
                title.textContent = 'Задержка';
                break;
            case 'variable':
                icon.className = 'fas fa-database';
                title.textContent = 'Переменная';
                break;
            default:
                icon.className = 'fas fa-cube';
                title.textContent = 'Блок';
        }

        content.appendChild(icon);
        content.appendChild(title);
        return content;
    }

    createConnectors(type) {
        const connectors = [];
        
        // Входной коннектор (сверху)
        const input = document.createElement('div');
        input.className = 'block-connector input';
        input.dataset.connectorType = 'input';
        connectors.push(input);

        // Выходные коннекторы (снизу)
        if (type === 'if') {
            // Для условного блока создаем два выхода
            const outputTrue = document.createElement('div');
            outputTrue.className = 'block-connector output output-true';
            outputTrue.dataset.connectorType = 'output-true';
            outputTrue.setAttribute('title', 'True');

            const outputFalse = document.createElement('div');
            outputFalse.className = 'block-connector output output-false';
            outputFalse.dataset.connectorType = 'output-false';
            outputFalse.setAttribute('title', 'False');

            connectors.push(outputTrue, outputFalse);
        } else {
            // Для остальных блоков один выход
            const output = document.createElement('div');
            output.className = 'block-connector output';
            output.dataset.connectorType = 'output';
            connectors.push(output);
        }

        return connectors;
    }

    selectBlock(block) {
        if (this.selectedBlock) {
            this.selectedBlock.classList.remove('selected');
        }
        this.selectedBlock = block;
        block.classList.add('selected');
        this.showBlockProperties(block);
    }

    async saveBot() {
        if (!this.userId) return;

        const schema = this.saveSchema();
        try {
            const response = await fetch('/api/bots', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    schema: schema
                })
            });

            if (response.ok) {
                showNotification('Бот успешно сохранен', 'success');
            } else {
                throw new Error('Ошибка сохранения');
            }
        } catch (error) {
            console.error('Ошибка сохранения бота:', error);
            showNotification('Ошибка сохранения бота', 'error');
        }
    }

    async testBot() {
        if (!this.botToken) {
            showNotification('Сначала настройте бота', 'warning');
            showTokenModal();
            return;
        }

        try {
            const schema = this.saveSchema();
            const response = await fetch('/api/test-bot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    token: this.botToken,
                    name: this.botName,
                    schema: schema
                })
            });

            if (response.ok) {
                showNotification('Бот успешно запущен!', 'success');
            } else {
                throw new Error('Ошибка запуска бота');
            }
        } catch (error) {
            console.error('Ошибка тестирования бота:', error);
            showNotification('Ошибка запуска бота', 'error');
        }
    }

    setBotSettings(name, token) {
        this.botName = name;
        this.botToken = token;
        
        // Активируем кнопку тестирования
        document.getElementById('testBotBtn').disabled = false;
        
        // Сохраняем настройки в localStorage
        localStorage.setItem(`botSettings_${this.userId}`, JSON.stringify({
            name: name,
            token: token
        }));
    }

    loadBotSettings() {
        const settings = localStorage.getItem(`botSettings_${this.userId}`);
        if (settings) {
            const { name, token } = JSON.parse(settings);
            this.botName = name;
            this.botToken = token;
            document.getElementById('testBotBtn').disabled = false;
        }
    }

    // ... остальные методы класса ...
}

// Функции для работы с модальным окном
function showTokenModal() {
    const modal = document.getElementById('tokenModal');
    modal.style.display = 'block';
    
    // Загружаем сохраненные настройки
    if (botBuilder.botName) {
        document.getElementById('botName').value = botBuilder.botName;
    }
    if (botBuilder.botToken) {
        document.getElementById('botToken').value = botBuilder.botToken;
    }
}

function closeTokenModal() {
    document.getElementById('tokenModal').style.display = 'none';
}

function toggleTokenVisibility() {
    const tokenInput = document.getElementById('botToken');
    const eyeIcon = document.querySelector('.btn-icon i');
    
    if (tokenInput.type === 'password') {
        tokenInput.type = 'text';
        eyeIcon.className = 'fas fa-eye-slash';
    } else {
        tokenInput.type = 'password';
        eyeIcon.className = 'fas fa-eye';
    }
}

function saveBotSettings() {
    const name = document.getElementById('botName').value.trim();
    const token = document.getElementById('botToken').value.trim();
    
    if (!name || !token) {
        showNotification('Заполните все поля', 'warning');
        return;
    }
    
    if (!token.match(/^\d+:[A-Za-z0-9_-]+$/)) {
        showNotification('Неверный формат токена', 'error');
        return;
    }
    
    botBuilder.setBotSettings(name, token);
    closeTokenModal();
    showNotification('Настройки сохранены', 'success');
}

// Добавляем стили для блоков на холсте
const style = document.createElement('style');
style.textContent = `
    .canvas-block {
        position: absolute;
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: 8px;
        padding: 1rem;
        min-width: 150px;
        cursor: move;
        user-select: none;
        z-index: 1;
        transition: border-color 0.3s ease;
    }

    .canvas-block.selected {
        border-color: var(--primary);
        box-shadow: 0 0 0 2px var(--primary-light);
    }

    .canvas-block .block-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .canvas-block i {
        color: var(--primary);
        font-size: 1.2rem;
    }

    .block-connector {
        position: absolute;
        width: 12px;
        height: 12px;
        background: var(--surface);
        border: 2px solid var(--primary);
        border-radius: 50%;
        cursor: pointer;
    }

    .block-connector.input {
        top: -6px;
        left: 50%;
        transform: translateX(-50%);
    }

    .block-connector.output {
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
    }

    .block-connector:hover {
        background: var(--primary);
    }
`;

document.head.appendChild(style);

// Инициализация при загрузке страницы
let botBuilder;
document.addEventListener('DOMContentLoaded', () => {
    botBuilder = new BotBuilder();
    botBuilder.loadBotSettings();
}); 