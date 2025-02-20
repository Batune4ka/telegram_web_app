let tg = window.Telegram.WebApp;

tg.expand();

function sendDataToBot() {
    const data = {
        message: "Привет из веб-приложения!"
    };
    tg.sendData(JSON.stringify(data));
    tg.close();
} 