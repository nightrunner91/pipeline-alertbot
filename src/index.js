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

const config = {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    groupId: process.env.TELEGRAM_GROUP_ID,
    gitlabSecret: process.env.GITLAB_WEBHOOK_SECRET,
    // Parse to ensure Express doesn't treat this as a pipe
    port: parseInt(process.env.PORT || '3000', 10)
};

if (!config.botToken || !config.groupId) {
    logError('Missing required environment variables (TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_ID)');
    process.exit(1);
}

// Initialize Bot
const bot = createBot(config.botToken);

// Initialize Web Server
const app = createServer(bot, config);

// Start Server
async function start() {
    try {
        logInfo('Telegram bot initialized (polling disabled)');

        // Explicitly bind to '::' (IPv6 wildcard) because Railway's internal proxy operates EXCLUSIVELY on IPv6
        app.listen(config.port, '::', () => {
            logInfo(`Webhook server listening on ::${config.port} (IPv6)`);
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
