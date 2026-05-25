const { buildMessage, buildMessageWithKeyboard, escapeHtml } = require('./message-builder');

function formatPipelineMessage(payload, style, projectNameOverride) {
    return buildMessage(payload, style, projectNameOverride);
}

function formatPipelineMessageWithKeyboard(payload, style, projectNameOverride, deployLink) {
    return buildMessageWithKeyboard(payload, style, projectNameOverride, deployLink);
}

module.exports = { formatPipelineMessage, formatPipelineMessageWithKeyboard, escapeHtml };
