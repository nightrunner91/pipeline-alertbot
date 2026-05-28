const { logInfo, logError } = require('./logger');

const pipelineStates = new Map();

function getPipelineState(pipelineId) {
    return pipelineStates.get(pipelineId) || null;
}

function setPipelineState(pipelineId, state) {
    pipelineStates.set(pipelineId, state);
    logInfo('Pipeline state updated', { pipelineId, stages: Object.keys(state) });
}

function clearPipelineState(pipelineId) {
    pipelineStates.delete(pipelineId);
}

function clearOldStates(maxAgeMs = 3600000) {
    const now = Date.now();
    for (const [id, state] of pipelineStates.entries()) {
        if (now - state.lastUpdated > maxAgeMs) {
            pipelineStates.delete(id);
            logInfo('Cleared old pipeline state', { pipelineId: id });
        }
    }
}

function detectStageTransitions(payload) {
    const pipelineId = payload.object_attributes?.id;
    const builds = payload.builds;

    if (!pipelineId || !builds || !Array.isArray(builds) || builds.length === 0) {
        return [];
    }

    const previousState = getPipelineState(pipelineId);
    const transitions = [];

    const currentState = {};
    for (const build of builds) {
        const stageName = build.stage?.toLowerCase();
        if (!stageName) continue;

        const prevStage = previousState?.[stageName];
        const prevStatus = prevStage?.status;
        const currStatus = build.status;

        currentState[stageName] = {
            status: currStatus,
            name: build.name,
            id: build.id,
            duration: build.duration || prevStage?.duration || null,
        };

        if (previousState && prevStatus !== currStatus) {
            transitions.push({
                stageName,
                previousStatus: prevStatus,
                currentStatus: currStatus,
                buildName: build.name,
                buildId: build.id,
            });
        }
    }

    if (!previousState) {
        const activeBuild = builds.find((b) => b.status === 'running');
        if (activeBuild) {
            const stageName = activeBuild.stage.toLowerCase();
            transitions.push({
                stageName,
                previousStatus: null,
                currentStatus: 'running',
                buildName: activeBuild.name,
                buildId: activeBuild.id,
            });
        }
    }

    setPipelineState(pipelineId, {
        ...currentState,
        lastUpdated: Date.now(),
    });

    if (payload.object_attributes?.status === 'success' ||
        payload.object_attributes?.status === 'failed' ||
        payload.object_attributes?.status === 'canceled') {
        clearPipelineState(pipelineId);
    }

    return transitions;
}

function trackJobDuration(pipelineId, stageName, duration) {
    if (!pipelineId || !stageName || !duration) return;

    const state = getPipelineState(pipelineId) || {};
    const stageKey = stageName.toLowerCase();

    if (!state[stageKey]) {
        state[stageKey] = { status: 'unknown', duration: null };
    }
    state[stageKey].duration = duration;
    state.lastUpdated = Date.now();

    setPipelineState(pipelineId, state);
}

function getCumulativeDuration(pipelineId) {
    const state = getPipelineState(pipelineId);
    if (!state) return null;

    let total = 0;
    let hasDuration = false;
    for (const [key, value] of Object.entries(state)) {
        if (key === 'lastUpdated') continue;
        if (value.duration) {
            total += value.duration;
            hasDuration = true;
        }
    }
    return hasDuration ? total : null;
}

function createPayloadForStage(originalPayload, stageInfo) {
    const stageBuild = originalPayload.builds?.find(
        (b) => b.stage?.toLowerCase() === stageInfo.stageName
    );

    if (!stageBuild) {
        return null;
    }

    const pipelineId = originalPayload.object_attributes?.id;
    const cumulativeDuration = getCumulativeDuration(pipelineId);

    const modifiedPayload = JSON.parse(JSON.stringify(originalPayload));
    modifiedPayload.object_attributes.status = stageInfo.currentStatus;
    if (modifiedPayload.object_attributes.detailed_status) {
        modifiedPayload.object_attributes.detailed_status.context = stageInfo.stageName;
        modifiedPayload.object_attributes.detailed_status.text = stageInfo.currentStatus;
    }
    if (cumulativeDuration !== null) {
        modifiedPayload.object_attributes.duration = cumulativeDuration;
    }
    modifiedPayload.builds = [stageBuild];

    return modifiedPayload;
}

module.exports = {
    getPipelineState,
    setPipelineState,
    clearPipelineState,
    clearOldStates,
    detectStageTransitions,
    createPayloadForStage,
    getCumulativeDuration,
    trackJobDuration,
};
