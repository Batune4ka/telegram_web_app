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

    createBlock(type, x, y, id = null) {
        const blockId = id || `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const block = document.createElement('div');
        block.className = 'canvas-block';
        block.id = blockId;
        block.dataset.blockType = type;
        block.style.left = `${x}px`;
        block.style.top = `${y}px`;

        const content = this.createBlockContent(type);
        const header = document.createElement('div');
        header.className = 'block-header';
        header.appendChild(content);

        // Добавляем кнопку удаления
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'block-delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteBlock(block);
        };
        header.appendChild(deleteBtn);

        block.appendChild(header);

        // Добавляем коннекторы
        const connectors = this.createConnectors(type);
        connectors.forEach(conn => block.appendChild(conn));

        this.canvas.appendChild(block);
        
        // Сохраняем данные блока
        this.blocks.set(blockId, {
            element: block,
            type: type,
            properties: this.getDefaultProperties(type),
            connections: {
                inputs: [],
                outputs: []
            }
        });

        // Делаем блок перетаскиваемым
        this.makeBlockDraggable(block);

        return block;
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

    makeBlockDraggable(block) {
        block.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('block-connector')) return;
            
            this.draggedBlock = block;
            const rect = block.getBoundingClientRect();
            this.offset.x = e.clientX - rect.left;
            this.offset.y = e.clientY - rect.top;
            this.selectBlock(block);
        });
    }

    createConnection(startConnector, endConnector) {
        if (!startConnector || !endConnector) return;
        
        const connection = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        connection.classList.add('connection');
        
        const startBlock = startConnector.closest('.canvas-block');
        const endBlock = endConnector.closest('.canvas-block');
        
        // Сохраняем связь
        this.connections.add({
            element: connection,
            from: {
                block: startBlock.id,
                connector: startConnector.dataset.connectorType
            },
            to: {
                block: endBlock.id,
                connector: endConnector.dataset.connectorType
            }
        });

        this.updateConnectionPath(connection, startConnector, endConnector);
        this.canvas.appendChild(connection);
    }

    updateConnectionPath(connection, start, end) {
        const startRect = start.getBoundingClientRect();
        const endRect = end.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();

        const startX = startRect.left + startRect.width / 2 - canvasRect.left;
        const startY = startRect.top + startRect.height / 2 - canvasRect.top;
        const endX = endRect.left + endRect.width / 2 - canvasRect.left;
        const endY = endRect.top + endRect.height / 2 - canvasRect.top;

        const controlPointOffset = Math.abs(endY - startY) / 2;
        
        const path = `M ${startX} ${startY} 
                     C ${startX} ${startY + controlPointOffset},
                       ${endX} ${endY - controlPointOffset},
                       ${endX} ${endY}`;
                       
        connection.setAttribute('d', path);
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

// При загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    botBuilder = new BotBuilder();
    botBuilder.loadBotSettings();
}); 