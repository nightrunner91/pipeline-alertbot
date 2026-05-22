const { Telegraf } = require('telegraf');
const { logInfo, logError } = require('../utils/logger');

function createBot(token) {
    const bot = new Telegraf(token);

    // Global Error Handler for bot polling/commands
    bot.catch((err, ctx) => {
        logError(`Unhandled error for ${ctx.updateType}`, err);
    });

    bot.command('start', (ctx) => {
        ctx.reply('Hello! I am the Pipeline Alert Bot. I will send notifications here when configured.');
    });

    return bot;
}

async function sendPipelineNotification(bot, chatId, message, reply_markup) {
    try {
        const options = {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        };
        if (reply_markup) {
            options.reply_markup = reply_markup;
        }
        await bot.telegram.sendMessage(chatId, message, options);
        logInfo('Notification sent successfully', { chatId });
    } catch (error) {
        logError('Failed to send notification', error, { chatId });
    }
}

module.exports = { createBot, sendPipelineNotification };
