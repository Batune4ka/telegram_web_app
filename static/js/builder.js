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
        const blockItems = document.querySelectorAll('.block-item');
        blockItems.forEach(item => {
            item.addEventListener('click', () => {
                const blockType = item.getAttribute('data-type');
                this.addBlockToCanvas(blockType);
            });

            // Добавляем поддержку touch для мобильных устройств
            item.addEventListener('touchend', (e) => {
                e.preventDefault();
                const blockType = item.getAttribute('data-type');
                this.addBlockToCanvas(blockType);
            });
        });

        // Обработчик для выбора блока на холсте
        this.canvas.addEventListener('click', (e) => {
            const block = e.target.closest('.canvas-block');
            if (block) {
                this.selectBlock(block);
            } else {
                this.deselectBlock();
            }
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

    addBlockToCanvas(type) {
        const blockId = `block_${Date.now()}`;
        const block = document.createElement('div');
        block.id = blockId;
        block.className = 'canvas-block';
        block.setAttribute('data-type', type);

        // Добавляем содержимое блока
        block.innerHTML = `
            <div class="block-header">
                <i class="fas ${this.getBlockIcon(type)}"></i>
                <span>${this.getBlockTitle(type)}</span>
            </div>
            <div class="block-content"></div>
            <div class="block-connectors">
                <div class="connector input"></div>
                <div class="connector output"></div>
            </div>
        `;

        // Делаем блок перетаскиваемым
        block.draggable = true;
        this.addDragListeners(block);

        // Добавляем блок на холст
        this.canvas.appendChild(block);
        
        // Позиционируем блок в центре видимой области холста
        const canvasRect = this.canvas.getBoundingClientRect();
        const blockRect = block.getBoundingClientRect();
        const scrollX = this.canvas.scrollLeft;
        const scrollY = this.canvas.scrollTop;

        const x = (canvasRect.width - blockRect.width) / 2 + scrollX;
        const y = (canvasRect.height - blockRect.height) / 2 + scrollY;

        block.style.left = `${x}px`;
        block.style.top = `${y}px`;

        // Сохраняем данные блока
        this.blocks.set(blockId, {
            type: type,
            properties: this.getDefaultProperties(type)
        });

        // Выбираем новый блок
        this.selectBlock(block);

        return block;
    }

    addDragListeners(block) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        block.addEventListener('mousedown', (e) => {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === block) {
                isDragging = true;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                block.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            }
        });

        document.addEventListener('mouseup', () => {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        });

        // Добавляем поддержку touch событий
        block.addEventListener('touchstart', (e) => {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;

            if (e.target === block) {
                isDragging = true;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                block.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            }
        });

        document.addEventListener('touchend', () => {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        });
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
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: 8px;
        padding: 1rem;
        min-width: 200px;
        cursor: move;
        user-select: none;
    }

    .canvas-block.selected {
        border-color: var(--primary);
        box-shadow: 0 0 0 2px var(--primary-light);
    }

    .block-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .block-header i {
        color: var(--primary);
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