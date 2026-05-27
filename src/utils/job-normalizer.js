function normalizeJobPayload(raw) {
    const projectId = raw.project?.id;
    const buildId = raw.build_id;
    const jobUrl = projectId && buildId
        ? `${raw.project.web_url}/-/jobs/${buildId}`
        : '';

    return {
        object_kind: 'pipeline',
        object_attributes: {
            id: buildId,
            ref: raw.build_ref || raw.build_tag || 'unknown',
            tag: !!raw.build_tag,
            sha: raw.commit?.sha || raw.commit?.id || '',
            before_sha: '0000000000000000000000000000000000000000',
            source: raw.build_source || 'push',
            status: raw.build_status,
            detailed_status: {
                context: (raw.build_stage || 'unknown').toLowerCase(),
                text: raw.build_status,
            },
            stages: [raw.build_stage || 'unknown'],
            created_at: raw.build_started_at || '',
            finished_at: raw.build_finished_at || null,
            duration: raw.build_duration || null,
            queued_duration: raw.build_queued_duration || null,
            variables: [],
        },
        project: raw.project,
        commit: raw.commit ? {
            id: raw.commit.sha || raw.commit.id,
            message: raw.commit.message || '',
            timestamp: raw.commit.timestamp || '',
            url: raw.commit.url || '',
            author: raw.commit.author || { name: 'Unknown', email: '' },
        } : undefined,
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

module.exports = { normalizeJobPayload };
