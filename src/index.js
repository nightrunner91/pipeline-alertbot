require('dotenv').config();
const { createBot } = require('./bot');
const { createServer } = require('./server');
const { logInfo, logError } = require('./utils/logger');

// Global Error Handlers to prevent silent fatal crashes
process.on('uncaughtException', (err) => {
    logError('FATAL: Uncaught Exception', err);
});
process.on('unhandledRejection', (reason, promise) => {
    logError('FATAL: Unhandled Rejection', reason);
});

let parsedPort = parseInt(process.env.PORT || '3000', 10);
if (isNaN(parsedPort)) {
    parsedPort = 3000;
}

const config = {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    groupId: process.env.TELEGRAM_GROUP_ID,
    gitlabSecret: process.env.GITLAB_WEBHOOK_SECRET,
    port: parsedPort
};

// Initialize Bot only if token is present
let bot = null;
if (config.botToken) {
    try {
        bot = createBot(config.botToken);
        logInfo('Telegram bot initialized successfully');
    } catch (err) {
        logError('Failed to initialize Telegram bot', err);
    }
} else {
    logError('TELEGRAM_BOT_TOKEN is missing. Bot functionality will be disabled.');
}

if (!config.groupId) {
    logError('TELEGRAM_GROUP_ID is missing. Notifications cannot be sent.');
}

// Initialize Web Server
const app = createServer(bot, config);

// Start Server
async function start() {
    try {
        logInfo('Starting webhook server...');

        // Explicitly bind to 0.0.0.0 to satisfy Docker/Railway IPv4 proxy requirements
        app.listen(config.port, '0.0.0.0', () => {
            logInfo(`Webhook server listening on 0.0.0.0:${config.port}`);
        });

        // Graceful Shutdown
        // Removed bot.stop() because it throws if bot.launch() wasn't called
        process.once('SIGINT', () => { 
            logInfo('Received SIGINT, shutting down...');
            process.exit(0); 
        });
        process.once('SIGTERM', () => { 
            logInfo('Received SIGTERM, shutting down...');
            process.exit(0); 
        });
    } catch (error) {
        logError('Startup failed', error);
        process.exit(1);
    }
}

start();
