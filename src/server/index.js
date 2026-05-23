const express = require('express');
const { logInfo, logError } = require('../utils/logger');
const { formatPipelineMessageWithKeyboard } = require('../services/gitlab');
const { sendPipelineNotification } = require('../bot');
const { findRepoConfig, validateWebhookSecret } = require('../utils/repo-config');

function createServer(bot, config, repositories) {
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
                HAS_REPOSITORY_CONFIG: !!config.repositoryConfig,
                ALERT_STYLE: config.alertStyle || 'card',
            },
            botInitialized: !!bot,
            registeredRepositories: repositories.size,
        };
        res.status(200).json(diagnostics);
    });

    app.post('/api/webhook/gitlab', async (req, res) => {
        try {
            logInfo('Received webhook request from GitLab');

            if (!bot) {
                logError('Webhook processing failed: Telegram bot is not initialized (missing token)');
                return res.status(500).send('Telegram bot is not initialized (missing token)');
            }

            const payload = req.body;
            const incomingSecret = req.headers['x-gitlab-token'];

            // Find the repository config based on the payload
            const repoConfig = findRepoConfig(repositories, payload);

            if (!repoConfig) {
                const projectId = payload.project?.id;
                const projectPath = payload.project?.path_with_namespace;
                logError('No repository config found for webhook', { projectId, projectPath });
                return res.status(404).send('No repository configuration found for this project');
            }

            // Validate secret against repo-specific secret (or fallback)
            if (!validateWebhookSecret(repoConfig, incomingSecret)) {
                logError('Unauthorized webhook attempt', { project: payload.project?.path_with_namespace });
                return res.status(401).send('Unauthorized');
            }

            logInfo('Webhook Payload Info', {
                kind: payload.object_kind,
                status: payload.object_attributes?.status,
                project: payload.project?.path_with_namespace,
                targetChat: repoConfig.chatId,
            });

            if (payload.object_kind !== 'pipeline') {
                logInfo('Ignored: not a pipeline event');
                return res.status(200).send('Ignored: not a pipeline event');
            }

            const status = payload.object_attributes?.status;
            if (['running', 'success', 'failed', 'canceled'].includes(status)) {
                const { message, reply_markup } = formatPipelineMessageWithKeyboard(payload, repoConfig.style, repoConfig.projectName);
                await sendPipelineNotification(bot, repoConfig.chatId, message, reply_markup);
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
