require('dotenv').config();
const { createBot } = require('./bot');
const { createServer } = require('./server');
const { logInfo, logError } = require('./utils/logger');

const config = {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    groupId: process.env.TELEGRAM_GROUP_ID,
    gitlabSecret: process.env.GITLAB_WEBHOOK_SECRET,
    port: process.env.PORT || 3000
};

if (!config.botToken || !config.groupId) {
    logError('Missing required environment variables (TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_ID)');
    process.exit(1);
}

// Initialize Bot
const bot = createBot(config.botToken);

// Initialize Web Server
const app = createServer(bot, config);

// Start Bot and Server
async function start() {
    try {
        // Removed bot.launch() to prevent polling conflicts. 
        // We only need the bot to SEND messages, not receive them.
        logInfo('Telegram bot initialized (polling disabled)');

        app.listen(config.port, '0.0.0.0', () => {
            logInfo(`Webhook server listening on port ${config.port}`);
        });

        // Graceful Shutdown
        process.once('SIGINT', () => { bot.stop('SIGINT'); process.exit(0); });
        process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(0); });
    } catch (error) {
        logError('Startup failed', error);
        process.exit(1);
    }
}

start();
