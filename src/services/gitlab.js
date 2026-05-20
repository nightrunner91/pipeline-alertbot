function formatPipelineMessage(payload) {
    const project = payload.project?.name || 'Unknown Project';
    const status = payload.object_attributes?.status;
    const ref = payload.object_attributes?.ref;
    const url = payload.project?.web_url + '/-/pipelines/' + payload.object_attributes?.id;
    const author = payload.commit?.author?.name || 'Unknown';
    const message = payload.commit?.message || '';

    let emoji = '🔄';
    if (status === 'success') emoji = '✅';
    if (status === 'failed') emoji = '❌';
    if (status === 'canceled') emoji = '⚠️';

    return `${emoji} *Pipeline ${status}* in *${project}*
Branch: \`${ref}\`
Author: ${author}
Commit: _${message.trim().split('\n')[0]}_
[View Pipeline](${url})`;
}

module.exports = { formatPipelineMessage };
