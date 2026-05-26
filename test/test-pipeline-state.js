const assert = require('assert');
const {
    detectStageTransitions,
    createPayloadForStage,
    clearOldStates,
    clearPipelineState,
    getPipelineState,
} = require('../src/utils/pipeline-state');

function createPayload(pipelineId, builds, status = 'running') {
    return {
        object_kind: 'pipeline',
        object_attributes: {
            id: pipelineId,
            status,
            detailed_status: {
                context: builds[0]?.stage || 'test',
                text: status,
            },
            stages: builds.map((b) => b.stage),
        },
        project: {
            id: 148,
            name: 'test-project',
        },
        builds,
    };
}

function createBuild(stage, status, name = null) {
    return {
        id: Math.random().toString(36).substr(2, 9),
        stage,
        status,
        name: name || `${stage}-job`,
    };
}

const tests = [
    {
        name: 'Detects running stage on first webhook',
        fn: () => {
            clearPipelineState(1);
            const payload = createPayload(1, [
                createBuild('test', 'running'),
                createBuild('build', 'pending'),
                createBuild('deploy_dev', 'pending'),
            ]);

            const transitions = detectStageTransitions(payload);
            assert(transitions.length === 1, `Expected 1 transition, got ${transitions.length}`);
            assert(transitions[0].stageName === 'test', `Expected stage 'test', got '${transitions[0].stageName}'`);
            assert(transitions[0].currentStatus === 'running', `Expected status 'running', got '${transitions[0].currentStatus}'`);
        },
    },
    {
        name: 'Detects stage transition from running to success',
        fn: () => {
            clearPipelineState(2);
            const payload1 = createPayload(2, [
                createBuild('test', 'running'),
                createBuild('build', 'pending'),
            ]);
            detectStageTransitions(payload1);

            const payload2 = createPayload(2, [
                createBuild('test', 'success'),
                createBuild('build', 'running'),
            ]);
            const transitions = detectStageTransitions(payload2);

            assert(transitions.length === 2, `Expected 2 transitions, got ${transitions.length}`);
            const testTransition = transitions.find((t) => t.stageName === 'test');
            const buildTransition = transitions.find((t) => t.stageName === 'build');
            assert(testTransition && testTransition.currentStatus === 'success', 'test should transition to success');
            assert(buildTransition && buildTransition.currentStatus === 'running', 'build should transition to running');
        },
    },
    {
        name: 'Detects full pipeline flow: test -> build -> deploy',
        fn: () => {
            clearPipelineState(3);

            const payload1 = createPayload(3, [
                createBuild('test', 'running'),
                createBuild('build', 'pending'),
                createBuild('deploy_dev', 'pending'),
            ]);
            const t1 = detectStageTransitions(payload1);
            assert(t1.length === 1 && t1[0].stageName === 'test', 'First webhook should detect test running');

            const payload2 = createPayload(3, [
                createBuild('test', 'success'),
                createBuild('build', 'running'),
                createBuild('deploy_dev', 'pending'),
            ]);
            const t2 = detectStageTransitions(payload2);
            assert(t2.length === 2, `Second webhook should detect 2 transitions, got ${t2.length}`);
            const buildT = t2.find((t) => t.stageName === 'build');
            assert(buildT && buildT.currentStatus === 'running', 'build should be running');

            const payload3 = createPayload(3, [
                createBuild('test', 'success'),
                createBuild('build', 'success'),
                createBuild('deploy_dev', 'running'),
            ]);
            const t3 = detectStageTransitions(payload3);
            assert(t3.length === 2, `Third webhook should detect 2 transitions, got ${t3.length}`);
            const deployT = t3.find((t) => t.stageName === 'deploy_dev');
            assert(deployT && deployT.currentStatus === 'running', 'deploy_dev should be running');
        },
    },
    {
        name: 'Returns empty array when no changes',
        fn: () => {
            clearPipelineState(4);
            const payload1 = createPayload(4, [
                createBuild('test', 'success'),
                createBuild('build', 'success'),
            ]);
            detectStageTransitions(payload1);

            const payload2 = createPayload(4, [
                createBuild('test', 'success'),
                createBuild('build', 'success'),
            ], 'success');
            const transitions = detectStageTransitions(payload2);
            assert(transitions.length === 0, `Expected 0 transitions, got ${transitions.length}`);
        },
    },
    {
        name: 'Clears state on pipeline completion',
        fn: () => {
            clearPipelineState(5);
            const payload = createPayload(5, [
                createBuild('test', 'success'),
                createBuild('build', 'success'),
            ], 'success');

            detectStageTransitions(payload);
            const state = getPipelineState(5);
            assert(state === null, 'State should be cleared after pipeline success');
        },
    },
    {
        name: 'createPayloadForStage creates modified payload',
        fn: () => {
            const original = createPayload(6, [
                createBuild('test', 'success'),
                createBuild('build', 'running'),
                createBuild('deploy_dev', 'pending'),
            ]);

            const stageInfo = {
                stageName: 'build',
                currentStatus: 'running',
            };

            const modified = createPayloadForStage(original, stageInfo);
            assert(modified.object_attributes.status === 'running', 'Status should be updated');
            assert(modified.builds.length === 1, 'Should have only one build');
            assert(modified.builds[0].stage === 'build', 'Build should be for build stage');
            assert(modified.object_attributes.detailed_status.context === 'build', 'Context should be updated');
        },
    },
    {
        name: 'createPayloadForStage returns null when build not found',
        fn: () => {
            const original = createPayload(7, [
                createBuild('test', 'success'),
                createBuild('build', 'running'),
            ]);

            const stageInfo = {
                stageName: 'nonexistent',
                currentStatus: 'running',
            };

            const result = createPayloadForStage(original, stageInfo);
            assert(result === null, 'Should return null when build not found');
        },
    },
    {
        name: 'Handles payload without builds array',
        fn: () => {
            clearPipelineState(8);
            const payload = {
                object_kind: 'pipeline',
                object_attributes: {
                    id: 8,
                    status: 'running',
                },
            };

            const transitions = detectStageTransitions(payload);
            assert(transitions.length === 0, 'Should return empty array without builds');
        },
    },
];

console.log('='.repeat(60));
console.log('Pipeline State - Test Suite');
console.log('='.repeat(60));
console.log();

let passed = 0;
let failed = 0;

for (const test of tests) {
    process.stdout.write(`Testing: ${test.name}... `);
    try {
        test.fn();
        console.log('PASS');
        passed++;
    } catch (err) {
        console.log(`FAIL: ${err.message}`);
        failed++;
    }
}

console.log();
console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
    process.exit(1);
}
