function normalizeJobPayload(raw) {
    const projectId = raw.project_id || raw.project?.id;
    const buildId = raw.build_id;
    const projectName = raw.project_name || raw.project?.name || raw.repository?.name || 'Unknown';
    const webUrl = raw.project?.web_url || raw.repository?.homepage || '';
    const namespace = raw.project?.namespace || extractNamespace(raw.repository?.homepage) || '';

    const jobUrl = projectId && buildId
        ? `${webUrl}/-/jobs/${buildId}`
        : '';

    const commitData = raw.commit || {};
    const commitSha = commitData.sha || raw.sha || '';
    const commitAuthor = commitData.author_name || commitData.author?.name || raw.user?.name || 'Unknown';
    const commitUrl = commitData.author_url
        ? `${commitData.author_url}/-/commit/${commitSha}`
        : (webUrl ? `${webUrl}/-/commit/${commitSha}` : '');

    return {
        object_kind: 'pipeline',
        object_attributes: {
            id: buildId,
            ref: raw.ref || raw.build_tag || 'unknown',
            tag: !!raw.tag,
            sha: commitSha,
            before_sha: raw.before_sha || '0000000000000000000000000000000000000000',
            source: raw.build_source || 'push',
            status: raw.build_status,
            detailed_status: {
                context: (raw.build_stage || 'unknown').toLowerCase(),
                text: raw.build_status,
            },
            stages: [raw.build_stage || 'unknown'],
            created_at: raw.build_created_at || '',
            finished_at: raw.build_finished_at || null,
            duration: raw.build_duration || null,
            queued_duration: raw.build_queued_duration || null,
            variables: [],
        },
        project: {
            id: projectId,
            name: projectName,
            web_url: webUrl,
            git_http_url: raw.repository?.git_http_url || raw.project?.git_http_url || '',
            namespace: namespace,
            visibility_level: raw.project?.visibility_level || 0,
        },
        commit: {
            id: commitSha,
            message: commitData.message || '',
            timestamp: commitData.timestamp || '',
            url: commitUrl,
            author: {
                name: commitAuthor,
                email: commitData.author_email || commitData.author?.email || raw.user?.email || '',
            },
        },
        user: raw.user,
        builds: [{
            id: buildId,
            stage: raw.build_stage,
            name: raw.build_name,
            status: raw.build_status,
        }],
        _jobUrl: jobUrl,
    };
}

function extractNamespace(homepage) {
    if (!homepage) return '';
    try {
        const url = new URL(homepage);
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
            return parts.slice(0, parts.length - 1).join('/');
        }
    } catch {
        return '';
    }
    return '';
}

module.exports = { normalizeJobPayload };
