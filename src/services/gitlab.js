function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function formatPipelineMessage(payload) {
    const project = escapeHtml(payload.project?.name || 'Unknown Project');
    const status = escapeHtml(payload.object_attributes?.status);
    const ref = escapeHtml(payload.object_attributes?.ref);
    const url = payload.project?.web_url + '/-/pipelines/' + payload.object_attributes?.id;
    const author = escapeHtml(payload.commit?.author?.name || 'Unknown');
    const message = escapeHtml(payload.commit?.message || '');

    let emoji = '🔄';
    if (status === 'success') emoji = '✅';
    if (status === 'failed') emoji = '❌';
    if (status === 'canceled') emoji = '⚠️';

    return `${emoji} <b>Pipeline ${status}</b> in <b>${project}</b>\n` +
           `Branch: <code>${ref}</code>\n` +
           `Author: ${author}\n` +
           `Commit: <i>${message.trim().split('\n')[0]}</i>\n` +
           `<a href="${url}">View Pipeline</a>`;
}

module.exports = { formatPipelineMessage };
