const express = require('express');
const { logInfo, logError } = require('../utils/logger');
const { formatPipelineMessageWithKeyboard } = require('../services/gitlab');
const { sendPipelineNotification } = require('../bot');

function createServer(bot, config) {
    const app = express();
    app.use(express.json());

    app.get('/', (req, res) => {
        const diagnostics = {
            status: 'running',
            env: {
                PORT: config.port,
                HAS_TELEGRAM_BOT_TOKEN: !!config.botToken,
                HAS_TELEGRAM_GROUP_ID: !!config.groupId,
                HAS_GITLAB_WEBHOOK_SECRET: !!config.gitlabSecret,
                ALERT_STYLE: config.alertStyle || 'card',
            },
            botInitialized: !!bot
        };
        res.status(200).json(diagnostics);
    });

    app.post('/api/webhook/gitlab', async (req, res) => {
        try {
            logInfo('Received webhook request from GitLab');

            // Fail-safe validation for initialization
            if (!bot) {
                logError('Webhook processing failed: Telegram bot is not initialized (missing token)');
                return res.status(500).send('Telegram bot is not initialized (missing token)');
            }
            if (!config.groupId) {
                logError('Webhook processing failed: TELEGRAM_GROUP_ID is missing');
                return res.status(500).send('TELEGRAM_GROUP_ID is missing');
            }

            // Validate Secret Token
            const gitlabToken = req.headers['x-gitlab-token'];
            if (config.gitlabSecret && gitlabToken !== config.gitlabSecret) {
                logError('Unauthorized webhook attempt');
                return res.status(401).send('Unauthorized');
            }

            const payload = req.body;
            logInfo('Webhook Payload Info', { kind: payload.object_kind, status: payload.object_attributes?.status });
            
            // We only care about pipeline events
            if (payload.object_kind !== 'pipeline') {
                logInfo('Ignored: not a pipeline event');
                return res.status(200).send('Ignored: not a pipeline event');
            }

            const status = payload.object_attributes?.status;
            // Only alert on specific statuses
            if (['running', 'success', 'failed', 'canceled'].includes(status)) {
                const { message, reply_markup } = formatPipelineMessageWithKeyboard(payload, config.alertStyle);
                await sendPipelineNotification(bot, config.groupId, message, reply_markup);
            }

            res.status(200).send('OK');
        } catch (error) {
            logError('Error processing webhook', error);
            res.status(500).send('Internal Server Error');
        }
    });

    return app;
}

module.exports = { createServer };
