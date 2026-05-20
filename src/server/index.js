const express = require('express');
const { logInfo, logError } = require('../utils/logger');
const { formatPipelineMessage } = require('../services/gitlab');
const { sendPipelineNotification } = require('../bot');

function createServer(bot, config) {
    const app = express();
    app.use(express.json());

    app.post('/api/webhook/gitlab', async (req, res) => {
        try {
            // Validate Secret Token
            const gitlabToken = req.headers['x-gitlab-token'];
            if (config.gitlabSecret && gitlabToken !== config.gitlabSecret) {
                logError('Unauthorized webhook attempt');
                return res.status(401).send('Unauthorized');
            }

            const payload = req.body;
            
            // We only care about pipeline events
            if (payload.object_kind !== 'pipeline') {
                return res.status(200).send('Ignored: not a pipeline event');
            }

            const status = payload.object_attributes?.status;
            // Only alert on specific statuses
            if (['running', 'success', 'failed', 'canceled'].includes(status)) {
                const message = formatPipelineMessage(payload);
                await sendPipelineNotification(bot, config.groupId, message);
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
