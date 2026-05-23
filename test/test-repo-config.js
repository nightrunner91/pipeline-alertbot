const { parseRepositoryConfig, findRepoConfig, validateWebhookSecret } = require('../src/utils/repo-config');

function assert(condition, message) {
    if (!condition) {
        throw new Error(`ASSERTION FAILED: ${message}`);
    }
}

function runTests() {
    console.log('='.repeat(60));
    console.log('Repository Config - Test Suite');
    console.log('='.repeat(60));
    console.log('');

    let passed = 0;
    let failed = 0;

    const tests = [
        {
            name: 'Parse array format config',
            run: () => {
                const envConfig = JSON.stringify([
                    { projectId: 123, chatId: '-100111', secret: 'secret1', style: 'card' },
                    { projectId: 456, chatId: '-100222', secret: 'secret2', style: 'tree' },
                ]);
                const repos = parseRepositoryConfig(envConfig, null, null, 'card');
                assert(repos.size === 2, `Expected 2 repos, got ${repos.size}`);
                assert(repos.has('id:123'), 'Should have repo by ID');
                assert(repos.has('id:456'), 'Should have repo by ID');
            },
        },
        {
            name: 'Parse object format config',
            run: () => {
                const envConfig = JSON.stringify({
                    '456': { chatId: '-100333', secret: 'secret3', style: 'minimal' },
                    '789': { chatId: '-100444' },
                });
                const repos = parseRepositoryConfig(envConfig, null, null, 'card');
                assert(repos.size === 2, `Expected 2 repos, got ${repos.size}`);
                assert(repos.has('id:456'), 'Should have repo by ID');
                assert(repos.has('id:789'), 'Should have repo by ID');
            },
        },
        {
            name: 'Fallback to single-repo config when no REPOSITORY_CONFIG',
            run: () => {
                const repos = parseRepositoryConfig(null, '-100555', 'fallback-secret', 'card');
                assert(repos.size === 1, `Expected 1 repo (fallback), got ${repos.size}`);
                assert(repos.has('fallback'), 'Should have fallback key');
                const fallback = repos.get('fallback');
                assert(fallback.chatId === '-100555', 'Should use fallback chatId');
                assert(fallback.secret === 'fallback-secret', 'Should use fallback secret');
            },
        },
        {
            name: 'Find repo config by projectId',
            run: () => {
                const envConfig = JSON.stringify([
                    { projectId: 123, chatId: '-100111' },
                    { projectId: 456, chatId: '-100222' },
                ]);
                const repos = parseRepositoryConfig(envConfig, null, null, 'card');
                const payload = { project: { id: 456 } };
                const config = findRepoConfig(repos, payload);
                assert(config !== null, 'Should find config');
                assert(config.chatId === '-100222', `Expected chatId -100222, got ${config.chatId}`);
            },
        },
        {
            name: 'Fallback to default config when no match',
            run: () => {
                const repos = parseRepositoryConfig(null, '-100999', 'fallback', 'card');
                const payload = { project: { id: 999 } };
                const config = findRepoConfig(repos, payload);
                assert(config !== null, 'Should find fallback config');
                assert(config.chatId === '-100999', `Expected fallback chatId -100999, got ${config.chatId}`);
            },
        },
        {
            name: 'Return null when no match and no fallback',
            run: () => {
                const envConfig = JSON.stringify([
                    { projectId: 123, chatId: '-100111' },
                ]);
                const repos = parseRepositoryConfig(envConfig, null, null, 'card');
                const payload = { project: { id: 999 } };
                const config = findRepoConfig(repos, payload);
                assert(config === null, 'Should return null when no match and no fallback');
            },
        },
        {
            name: 'Validate webhook secret - match',
            run: () => {
                const repoConfig = { secret: 'my-secret', chatId: '-100111' };
                assert(validateWebhookSecret(repoConfig, 'my-secret') === true, 'Should validate matching secret');
            },
        },
        {
            name: 'Validate webhook secret - mismatch',
            run: () => {
                const repoConfig = { secret: 'my-secret', chatId: '-100111' };
                assert(validateWebhookSecret(repoConfig, 'wrong-secret') === false, 'Should reject mismatching secret');
            },
        },
        {
            name: 'Validate webhook secret - no secret configured',
            run: () => {
                const repoConfig = { chatId: '-100111' };
                assert(validateWebhookSecret(repoConfig, 'anything') === true, 'Should allow when no secret configured');
            },
        },
        {
            name: 'Use repo-specific style',
            run: () => {
                const envConfig = JSON.stringify([
                    { projectId: 123, chatId: '-100111', style: 'tree' },
                ]);
                const repos = parseRepositoryConfig(envConfig, null, null, 'card');
                const payload = { project: { id: 123 } };
                const config = findRepoConfig(repos, payload);
                assert(config.style === 'tree', `Expected style "tree", got "${config.style}"`);
            },
        },
        {
            name: 'Use default style when not specified',
            run: () => {
                const envConfig = JSON.stringify([
                    { projectId: 123, chatId: '-100111' },
                ]);
                const repos = parseRepositoryConfig(envConfig, null, null, 'minimal');
                const payload = { project: { id: 123 } };
                const config = findRepoConfig(repos, payload);
                assert(config.style === 'minimal', `Expected style "minimal", got "${config.style}"`);
            },
        },
        {
            name: 'Skip entries missing projectId',
            run: () => {
                const envConfig = JSON.stringify([
                    { chatId: '-100111' },
                    { projectId: 123, chatId: '-100222' },
                ]);
                const repos = parseRepositoryConfig(envConfig, null, null, 'card');
                assert(repos.size === 1, `Expected 1 repo (skipped invalid), got ${repos.size}`);
                assert(repos.has('id:123'), 'Should only have valid entry');
            },
        },
        {
            name: 'Skip entries missing chatId',
            run: () => {
                const envConfig = JSON.stringify([
                    { projectId: 123 },
                    { projectId: 456, chatId: '-100222' },
                ]);
                const repos = parseRepositoryConfig(envConfig, null, null, 'card');
                assert(repos.size === 1, `Expected 1 repo (skipped invalid), got ${repos.size}`);
                assert(repos.has('id:456'), 'Should only have valid entry');
            },
        },
        {
            name: 'Parse projectName from config',
            run: () => {
                const envConfig = JSON.stringify([
                    { projectId: 123, chatId: '-100111', projectName: 'My Custom API' },
                ]);
                const repos = parseRepositoryConfig(envConfig, null, null, 'card');
                const config = repos.get('id:123');
                assert(config.projectName === 'My Custom API', `Expected projectName "My Custom API", got "${config.projectName}"`);
            },
        },
        {
            name: 'projectName defaults to null when not specified',
            run: () => {
                const envConfig = JSON.stringify([
                    { projectId: 123, chatId: '-100111' },
                ]);
                const repos = parseRepositoryConfig(envConfig, null, null, 'card');
                const config = repos.get('id:123');
                assert(config.projectName === null, `Expected projectName null, got "${config.projectName}"`);
            },
        },
    ];

    for (const test of tests) {
        process.stdout.write(`Testing: ${test.name}... `);

        try {
            test.run();
            console.log('PASS');
            passed++;
        } catch (err) {
            console.log(`FAIL: ${err.message}`);
            failed++;
        }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(60));

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
