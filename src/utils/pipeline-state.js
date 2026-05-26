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

        currentState[stageName] = {
            status: build.status,
            name: build.name,
            id: build.id,
        };

        if (previousState && previousState[stageName]) {
            const prevStatus = previousState[stageName].status;
            const currStatus = build.status;

            if (prevStatus !== currStatus) {
                transitions.push({
                    stageName,
                    previousStatus: prevStatus,
                    currentStatus: currStatus,
                    buildName: build.name,
                    buildId: build.id,
                });
            }
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

function createPayloadForStage(originalPayload, stageInfo) {
    const stageBuild = originalPayload.builds?.find(
        (b) => b.stage?.toLowerCase() === stageInfo.stageName
    );

    if (!stageBuild) {
        return null;
    }

    const modifiedPayload = JSON.parse(JSON.stringify(originalPayload));
    modifiedPayload.object_attributes.status = stageInfo.currentStatus;
    if (modifiedPayload.object_attributes.detailed_status) {
        modifiedPayload.object_attributes.detailed_status.context = stageInfo.stageName;
        modifiedPayload.object_attributes.detailed_status.text = stageInfo.currentStatus;
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
};
