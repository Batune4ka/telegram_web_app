class BotBuilder {
    constructor() {
        this.canvas = document.getElementById('builderCanvas');
        this.propertiesPanel = document.getElementById('blockProperties');
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
        // Обработчики для блоков в сайдбаре
        const sidebarBlocks = document.querySelectorAll('.block-item');
        sidebarBlocks.forEach(block => {
            block.draggable = true;
            block.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('blockType', block.dataset.blockType);
            });
        });

        // Обработчики для холста
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
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
        block.draggable = true;
        block.dataset.blockType = type;
        block.style.left = `${x}px`;
        block.style.top = `${y}px`;

        // Добавляем содержимое блока
        const content = this.createBlockContent(type);
        block.appendChild(content);

        // Добавляем обработчики для перетаскивания
        block.addEventListener('dragstart', (e) => {
            this.draggedBlock = block;
            const rect = block.getBoundingClientRect();
            this.offset.x = e.clientX - rect.left;
            this.offset.y = e.clientY - rect.top;
        });

        block.addEventListener('click', () => {
            this.selectBlock(block);
        });

        this.canvas.appendChild(block);
        this.blocks.set(block.id, {
            type: type,
            properties: this.getDefaultProperties(type)
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

    getDefaultProperties(type) {
        switch(type) {
            case 'command':
                return {
                    command: '',
                    description: '',
                    response: ''
                };
            case 'message':
                return {
                    pattern: '',
                    response: ''
                };
            case 'button':
                return {
                    text: '',
                    callback_data: '',
                    url: ''
                };
            case 'send-message':
                return {
                    pattern: '',
                    response: ''
                };
            case 'if':
                return {
                    condition: '',
                    true_branch: '',
                    false_branch: ''
                };
            case 'delay':
                return {
                    duration: ''
                };
            case 'variable':
                return {
                    name: '',
                    value: ''
                };
            default:
                return {};
        }
    }

    selectBlock(block) {
        if (this.selectedBlock) {
            this.selectedBlock.classList.remove('selected');
        }
        this.selectedBlock = block;
        block.classList.add('selected');
        this.showBlockProperties(block);
    }

    showBlockProperties(block) {
        const blockData = this.blocks.get(block.id);
        const properties = blockData.properties;
        
        this.propertiesPanel.innerHTML = '';
        const title = document.createElement('h3');
        title.textContent = `Настройки ${this.getBlockTitle(blockData.type)}`;
        this.propertiesPanel.appendChild(title);

        for (const [key, value] of Object.entries(properties)) {
            const group = document.createElement('div');
            group.className = 'property-group';

            const label = document.createElement('label');
            label.textContent = this.getPropertyLabel(key);

            const input = document.createElement('input');
            input.type = 'text';
            input.value = value;
            input.addEventListener('change', (e) => {
                properties[key] = e.target.value;
            });

            group.appendChild(label);
            group.appendChild(input);
            this.propertiesPanel.appendChild(group);
        }
    }

    getBlockTitle(type) {
        const titles = {
            'command': 'команды',
            'message': 'сообщения',
            'button': 'кнопки',
            'send-message': 'отправки',
            'if': 'условия',
            'delay': 'задержки',
            'variable': 'переменной'
        };
        return titles[type] || 'блока';
    }

    getPropertyLabel(key) {
        const labels = {
            'command': 'Команда',
            'description': 'Описание',
            'response': 'Ответ',
            'pattern': 'Шаблон',
            'text': 'Текст',
            'callback_data': 'Callback data',
            'url': 'URL',
            'condition': 'Условие',
            'true_branch': 'True branch',
            'false_branch': 'False branch',
            'duration': 'Duration',
            'name': 'Name',
            'value': 'Value'
        };
        return labels[key] || key;
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
        background: white;
        border: 2px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        min-width: 150px;
        cursor: move;
        user-select: none;
    }

    .canvas-block.selected {
        border-color: #2196F3;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }

    .block-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .property-group {
        margin-bottom: 15px;
    }

    .property-group label {
        display: block;
        margin-bottom: 5px;
        color: var(--text-secondary);
    }

    .property-group input {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--border);
        border-radius: 4px;
    }
`;

document.head.appendChild(style);

// Инициализация при загрузке страницы
let botBuilder;
document.addEventListener('DOMContentLoaded', () => {
    botBuilder = new BotBuilder();
    botBuilder.loadBotSettings();
}); 