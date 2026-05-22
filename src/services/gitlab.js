const { buildMessage, buildMessageWithKeyboard, escapeHtml } = require('./message-builder');

function formatPipelineMessage(payload, style) {
    return buildMessage(payload, style);
}

function formatPipelineMessageWithKeyboard(payload, style) {
    return buildMessageWithKeyboard(payload, style);
}

module.exports = { formatPipelineMessage, formatPipelineMessageWithKeyboard, escapeHtml };
