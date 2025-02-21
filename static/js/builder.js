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
        document.querySelectorAll('.block-item').forEach(block => {
            block.addEventListener('click', (e) => {
                const blockType = block.getAttribute('data-type');
                const rect = this.canvas.getBoundingClientRect();
                // Размещаем блок в центре холста
                const x = rect.width / 2 - 100; // 100 - половина ширины блока
                const y = rect.height / 2 - 50; // 50 - половина высоты блока
                this.createBlock(blockType, x, y);
            });
        });

        // Обработчик для перемещения блоков на холсте
        this.canvas.addEventListener('mousedown', (e) => {
            const block = e.target.closest('.canvas-block');
            if (block) {
                this.startDragging(block, e);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.draggedBlock) {
                this.moveBlock(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.draggedBlock) {
                this.stopDragging();
            }
        });

        // Обработчики для мобильных устройств
        this.canvas.addEventListener('touchstart', (e) => {
            const block = e.target.closest('.canvas-block');
            if (block) {
                e.preventDefault();
                this.startDragging(block, e.touches[0]);
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (this.draggedBlock) {
                e.preventDefault();
                this.moveBlock(e.touches[0]);
            }
        });

        document.addEventListener('touchend', () => {
            if (this.draggedBlock) {
                this.stopDragging();
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
        block.setAttribute('data-type', type);
        
        // Добавляем содержимое блока в зависимости от типа
        const content = this.getBlockContent(type);
        block.innerHTML = content;
        
        // Устанавливаем позицию
        block.style.left = `${x}px`;
        block.style.top = `${y}px`;
        
        this.canvas.appendChild(block);
        return block;
    }

    getBlockContent(type) {
        const icons = {
            'command': '⌘',
            'message': '💬',
            'button': '🔲',
            'send-message': '📤',
            'send-photo': '📷',
            'keyboard': '⌨️',
            'condition': '⚡',
        };

        const titles = {
            'command': 'Команда',
            'message': 'Сообщение',
            'button': 'Кнопка',
            'send-message': 'Отправить сообщение',
            'send-photo': 'Отправить фото',
            'keyboard': 'Клавиатура',
            'condition': 'Условие',
        };

        return `
            <div class="block-header">
                <span class="block-icon">${icons[type] || '📦'}</span>
                <span class="block-title">${titles[type] || 'Блок'}</span>
            </div>
        `;
    }

    startDragging(block, event) {
        this.draggedBlock = block;
        const rect = block.getBoundingClientRect();
        this.dragOffset = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        block.classList.add('dragging');
    }

    moveBlock(event) {
        const rect = this.canvas.getBoundingClientRect();
        let x = event.clientX - rect.left - this.dragOffset.x;
        let y = event.clientY - rect.top - this.dragOffset.y;

        // Ограничиваем движение пределами холста
        x = Math.max(0, Math.min(x, rect.width - this.draggedBlock.offsetWidth));
        y = Math.max(0, Math.min(y, rect.height - this.draggedBlock.offsetHeight));

        this.draggedBlock.style.left = `${x}px`;
        this.draggedBlock.style.top = `${y}px`;
    }

    stopDragging() {
        this.draggedBlock.classList.remove('dragging');
        this.draggedBlock = null;
    }

    selectBlock(block) {
        if (this.selectedBlock) {
            this.selectedBlock.classList.remove('selected');
        }
        this.selectedBlock = block;
        block.classList.add('selected');
        this.showProperties(block);
    }

    deselectBlock() {
        if (this.selectedBlock) {
            this.selectedBlock.classList.remove('selected');
            this.selectedBlock = null;
            this.propertiesPanel.innerHTML = '<h3>Свойства</h3><p>Выберите блок для настройки</p>';
        }
    }

    showProperties(block) {
        const blockData = this.blocks.get(block.id);
        if (!blockData) return;

        this.propertiesPanel.innerHTML = `
            <h3>Свойства: ${this.getBlockTitle(blockData.type)}</h3>
            <div class="properties-form"></div>
        `;

        const form = this.propertiesPanel.querySelector('.properties-form');
        Object.entries(blockData.properties).forEach(([key, value]) => {
            const field = this.createPropertyField(key, value, (newValue) => {
                blockData.properties[key] = newValue;
            });
            form.appendChild(field);
        });
    }

    createPropertyField(key, value, onChange) {
        const field = document.createElement('div');
        field.className = 'property-field';

        const label = document.createElement('label');
        label.textContent = this.getPropertyLabel(key);
        field.appendChild(label);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.addEventListener('change', (e) => onChange(e.target.value));
        field.appendChild(input);

        return field;
    }

    getBlockIcon(type) {
        const icons = {
            'command': 'fa-terminal',
            'message': 'fa-comment',
            'button': 'fa-square'
        };
        return icons[type] || 'fa-cube';
    }

    getBlockTitle(type) {
        const titles = {
            'command': 'Команда',
            'message': 'Сообщение',
            'button': 'Кнопка'
        };
        return titles[type] || 'Блок';
    }

    getDefaultProperties(type) {
        const properties = {
            'command': {
                command: '',
                description: '',
                response: ''
            },
            'message': {
                text: '',
                parse_mode: 'HTML'
            },
            'button': {
                text: '',
                callback_data: ''
            }
        };
        return properties[type] || {};
    }

    getPropertyLabel(key) {
        const labels = {
            'command': 'Команда',
            'description': 'Описание',
            'response': 'Ответ',
            'text': 'Текст',
            'parse_mode': 'Режим разметки',
            'callback_data': 'Callback data'
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
        background: #2c2c2c;
        border: 2px solid #3d3d3d;
        border-radius: 8px;
        padding: 15px;
        min-width: 200px;
        cursor: move;
        user-select: none;
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .canvas-block.dragging {
        opacity: 0.8;
        box-shadow: 0 5px 10px rgba(0,0,0,0.3);
    }

    .block-header {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .block-icon {
        font-size: 20px;
    }

    .block-title {
        font-size: 16px;
        font-weight: 500;
    }

    #builderCanvas {
        position: relative;
        min-height: 600px;
        background: #1e1e1e;
        border-radius: 8px;
        overflow: hidden;
    }

    .canvas-block.selected {
        border-color: var(--primary);
        box-shadow: 0 0 0 2px var(--primary-light);
    }

    .block-connectors {
        position: relative;
        height: 20px;
    }

    .connector {
        position: absolute;
        width: 12px;
        height: 12px;
        background: var(--surface);
        border: 2px solid var(--primary);
        border-radius: 50%;
        cursor: pointer;
    }

    .connector.input {
        top: -6px;
        left: 50%;
        transform: translateX(-50%);
    }

    .connector.output {
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
    }

    .property-field {
        margin-bottom: 1rem;
    }

    .property-field label {
        display: block;
        margin-bottom: 0.5rem;
        color: var(--text-secondary);
    }

    .property-field input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--surface);
        color: var(--text-primary);
    }

    .property-field input:focus {
        border-color: var(--primary);
        outline: none;
    }
`;

document.head.appendChild(style);

// Инициализация при загрузке страницы
let botBuilder;
document.addEventListener('DOMContentLoaded', () => {
    botBuilder = new BotBuilder();
    botBuilder.loadBotSettings();
}); 