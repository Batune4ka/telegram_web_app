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
        this.currentStep = 1;
        this.totalSteps = 5; // Добавили шаг для приветственного сообщения
        this.botData = {
            name: '',
            description: '',
            welcomeMessage: '',
            commands: [],
            messages: [],
            buttons: [],
            settings: {
                notifications: true,
                autoResponder: false,
                language: 'ru',
                timezone: 'UTC+3'
            }
        };
        
        this.initializeEventListeners();
        this.loadUserData();
        this.initTheme();
        this.showStep(1);
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

        // Кнопки навигации
        document.getElementById('prevStep').addEventListener('click', () => this.navigate(-1));
        document.getElementById('nextStep').addEventListener('click', () => this.navigate(1));

        // Добавление команды
        document.getElementById('addCommand').addEventListener('click', () => {
            this.showDialog('command', {
                title: 'Добавить команду',
                fields: [
                    { name: 'command', label: 'Команда', type: 'text', placeholder: '/start', required: true },
                    { name: 'description', label: 'Описание', type: 'text', placeholder: 'Начать работу с ботом' },
                    { name: 'response', label: 'Ответ', type: 'textarea', placeholder: 'Привет! Я бот...' },
                    { name: 'showButton', label: 'Показывать кнопку', type: 'checkbox' }
                ],
                onSave: (data) => {
                    this.botData.commands.push(data);
                    this.updateCommandsList();
                }
            });
        });

        // Добавление сообщения
        document.getElementById('addMessage').addEventListener('click', () => {
            this.showDialog('message', {
                title: 'Добавить сообщение',
                fields: [
                    { name: 'trigger', label: 'Триггер', type: 'text', placeholder: 'привет', required: true },
                    { name: 'response', label: 'Ответ', type: 'textarea', placeholder: 'Привет! Как дела?' },
                    { name: 'isRegex', label: 'Использовать регулярное выражение', type: 'checkbox' }
                ],
                onSave: (data) => {
                    this.botData.messages.push(data);
                    this.updateMessagesList();
                }
            });
        });

        // Добавление кнопки
        document.getElementById('addButton').addEventListener('click', () => {
            this.showDialog('button', {
                title: 'Добавить кнопку',
                fields: [
                    { name: 'text', label: 'Текст кнопки', type: 'text', required: true },
                    { 
                        name: 'type', 
                        label: 'Тип кнопки', 
                        type: 'select',
                        options: [
                            { value: 'text', label: 'Текстовая' },
                            { value: 'url', label: 'Ссылка' },
                            { value: 'callback', label: 'Callback' }
                        ]
                    },
                    { name: 'value', label: 'Значение', type: 'text', required: true }
                ],
                onSave: (data) => {
                    this.botData.buttons.push(data);
                    this.updateButtonsList();
                }
            });
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

    showStep(step) {
        // Скрываем все шаги
        document.querySelectorAll('.builder-step').forEach(el => el.classList.remove('active'));
        // Показываем нужный шаг
        document.querySelector(`#step${step}`).classList.add('active');
        
        // Обновляем прогресс-бар
        document.querySelectorAll('.progress-step').forEach(el => {
            const stepNum = parseInt(el.dataset.step);
            if (stepNum <= step) {
                el.classList.add('completed');
            } else {
                el.classList.remove('completed');
            }
            if (stepNum === step) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        // Обновляем кнопки навигации
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        
        prevBtn.style.display = step === 1 ? 'none' : 'block';
        nextBtn.textContent = step === this.totalSteps ? 'Создать бота' : 'Далее';
    }

    addCommandTemplate() {
        return `
            <div class="command-block">
                <div class="command-header">
                    <input type="text" class="command-name" placeholder="/команда" required>
                    <button class="btn-delete-command">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <input type="text" class="command-description" placeholder="Описание команды" required>
                <textarea class="command-response" placeholder="Ответ на команду" required></textarea>
                <div class="command-options">
                    <label class="checkbox-container">
                        <input type="checkbox" class="show-keyboard">
                        <span>Показывать клавиатуру</span>
                    </label>
                </div>
            </div>
        `;
    }

    addKeyboardButtonTemplate() {
        return `
            <div class="keyboard-button">
                <input type="text" placeholder="Текст кнопки" required>
                <select class="button-action">
                    <option value="text">Отправить текст</option>
                    <option value="url">Открыть ссылку</option>
                    <option value="callback">Callback</option>
                </select>
                <input type="text" placeholder="Значение" required>
                <button class="btn-delete-button">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    validateStep(step) {
        switch(step) {
            case 1: // Основная информация
                return this.botData.name && this.botData.description;
            case 2: // Приветственное сообщение
                return this.botData.welcomeMessage;
            case 3: // Команды
                return this.botData.commands.length > 0;
            case 4: // Сообщения
                return true; // Необязательный шаг
            case 5: // Клавиатура
                return true; // Необязательный шаг
            default:
                return false;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }

    createBot() {
        // Здесь будет логика создания бота
        console.log('Создание бота:', this.botData);
        this.showSuccess('Бот успешно создан!');
        // Можно добавить редирект на страницу управления ботом
        setTimeout(() => {
            window.location.href = '/my-bots.html';
        }, 2000);
    }

    showDialog(type, config) {
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog">
                <div class="dialog-header">
                    <h3>${config.title}</h3>
                    <button class="dialog-close">×</button>
                </div>
                <form class="dialog-form">
                    ${config.fields.map(field => this.createFormField(field)).join('')}
                    <div class="dialog-actions">
                        <button type="button" class="btn btn-secondary">Отмена</button>
                        <button type="submit" class="btn btn-primary">Сохранить</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(dialog);

        // Обработчики событий
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.remove());
        dialog.querySelector('.btn-secondary').addEventListener('click', () => dialog.remove());
        
        dialog.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            config.onSave(data);
            dialog.remove();
            this.showNotification('Успешно добавлено');
        });
    }

    createFormField(field) {
        switch(field.type) {
            case 'text':
                return `
                    <div class="form-group">
                        <label>${field.label}</label>
                        <input type="text" name="${field.name}" 
                               placeholder="${field.placeholder || ''}"
                               ${field.required ? 'required' : ''}>
                    </div>
                `;
            case 'textarea':
                return `
                    <div class="form-group">
                        <label>${field.label}</label>
                        <textarea name="${field.name}" 
                                 placeholder="${field.placeholder || ''}"
                                 ${field.required ? 'required' : ''}></textarea>
                    </div>
                `;
            case 'select':
                return `
                    <div class="form-group">
                        <label>${field.label}</label>
                        <select name="${field.name}" ${field.required ? 'required' : ''}>
                            ${field.options.map(opt => 
                                `<option value="${opt.value}">${opt.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            case 'checkbox':
                return `
                    <div class="form-group checkbox">
                        <label>
                            <input type="checkbox" name="${field.name}">
                            ${field.label}
                        </label>
                    </div>
                `;
            default:
                return '';
        }
    }

    navigate(direction) {
        const newStep = this.currentStep + direction;
        
        if (newStep < 1 || newStep > this.totalSteps) return;
        
        if (direction > 0 && !this.validateStep(this.currentStep)) {
            this.showNotification('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }

        this.currentStep = newStep;
        this.updateProgressBar();
        this.showCurrentStep();
        this.updateNavigationButtons();
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    updateProgressBar() {
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            if (index + 1 === this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    showCurrentStep() {
        document.querySelectorAll('.builder-step').forEach((step, index) => {
            if (index + 1 === this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');

        prevBtn.style.display = this.currentStep === 1 ? 'none' : 'block';
        
        if (this.currentStep === this.totalSteps) {
            nextBtn.textContent = 'Создать бота';
            nextBtn.classList.add('btn-success');
        } else {
            nextBtn.textContent = 'Далее';
            nextBtn.classList.remove('btn-success');
        }
    }

    finishBotCreation() {
        // Здесь будет логика создания бота
        console.log('Создание бота:', this.botData);
        this.showNotification('Бот успешно создан!');
        setTimeout(() => {
            window.location.href = 'my-bots.html';
        }, 2000);
    }
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

// Добавляем стили
const styles = `
    .command-block {
        background: var(--surface);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .command-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .command-name {
        font-size: 16px;
        font-weight: 500;
        border: none;
        background: transparent;
        color: var(--text-primary);
        flex: 1;
    }

    .btn-delete-command {
        background: none;
        border: none;
        color: var(--danger);
        cursor: pointer;
        padding: 5px;
        border-radius: 4px;
    }

    .command-description,
    .command-response {
        width: 100%;
        margin-bottom: 10px;
        padding: 8px;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--background);
        color: var(--text-primary);
    }

    .command-response {
        min-height: 100px;
        resize: vertical;
    }

    .keyboard-button {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
    }

    .keyboard-button input,
    .keyboard-button select {
        padding: 8px;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--background);
        color: var(--text-primary);
    }

    .keyboard-button select {
        min-width: 120px;
    }

    .checkbox-container {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    }

    .success-message,
    .error-message {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 20px;
        border-radius: 4px;
        color: white;
        animation: slideUp 0.3s ease;
    }

    .success-message {
        background: var(--success);
    }

    .error-message {
        background: var(--danger);
    }

    @keyframes slideUp {
        from { transform: translate(-50%, 100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
`;

// Добавляем стили на страницу
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Инициализация при загрузке страницы
let botBuilder;
document.addEventListener('DOMContentLoaded', () => {
    botBuilder = new BotBuilder();
    botBuilder.loadBotSettings();
}); 