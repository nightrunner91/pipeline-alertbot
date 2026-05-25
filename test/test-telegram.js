const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { createBot } = require('../src/bot');
const { createServer } = require('../src/server');
const { parseRepositoryConfig } = require('../src/utils/repo-config');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

const TESTS = [
    {
        name: 'Build Running',
        file: 'pipeline-running.json',
        description: 'Should notify: build stage + running status',
    },
    {
        name: 'Deploy Success',
        file: 'pipeline-success.json',
        description: 'Should notify: deploy stage + success status',
    },
    {
        name: 'Test Failed',
        file: 'pipeline-failed.json',
        description: 'Should notify: test stage + failed status',
    },
];

function sendWebhook(payload, secret) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: process.env.PORT || 3000,
            path: '/api/webhook/gitlab',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        };

        if (secret) {
            options.headers['X-Gitlab-Token'] = secret;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data,
                });
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function waitForServer(url, maxRetries = 10, delay = 500) {
    return new Promise((resolve, reject) => {
        let retries = 0;
        function tryConnect() {
            http.get(url, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    retry();
                }
            }).on('error', () => {
                retry();
            });
        }
        function retry() {
            retries++;
            if (retries >= maxRetries) {
                reject(new Error('Server did not start in time'));
            } else {
                setTimeout(tryConnect, delay);
            }
        }
        tryConnect();
    });
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('Pipeline Alertbot - Telegram Live Test Suite');
    console.log('='.repeat(60));
    console.log('');

    if (!process.env.TELEGRAM_BOT_TOKEN) {
        console.log('ERROR: TELEGRAM_BOT_TOKEN is not set in .env');
        process.exit(1);
    }

    const config = {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        groupId: process.env.TELEGRAM_GROUP_ID,
        gitlabSecret: process.env.GITLAB_WEBHOOK_SECRET,
        port: parseInt(process.env.PORT || '3000', 10),
        alertStyle: process.env.ALERT_STYLE || 'card',
        repositoryConfig: process.env.REPOSITORY_CONFIG || null,
    };

    const repositories = parseRepositoryConfig(
        config.repositoryConfig,
        config.groupId,
        config.gitlabSecret,
        config.alertStyle
    );

    console.log(`Loaded ${repositories.size} repository configuration(s)`);
    console.log(`Target chat: ${repositories.get('id:148')?.chatId || 'N/A'}`);
    console.log('');

    const bot = createBot(config.botToken);
    const app = createServer(bot, config, repositories);

    const server = app.listen(config.port, '0.0.0.0', () => {
        console.log(`Server listening on port ${config.port}`);
    });

    await waitForServer(`http://localhost:${config.port}`);
    console.log('Server is ready');
    console.log('');

    let passed = 0;
    let failed = 0;

    for (const testCase of TESTS) {
        process.stdout.write(`Testing: ${testCase.name}... `);

        const fixturePath = path.join(FIXTURES_DIR, testCase.file);
        const payload = fs.readFileSync(fixturePath, 'utf-8');
        const secret = '0b66fd6b-4234-4cc1-8f5c-55164a65d012';

        try {
            const result = await sendWebhook(payload, secret);

            if (result.statusCode === 200) {
                console.log('PASS - Message sent to Telegram');
                passed++;
            } else {
                console.log(`FAIL - HTTP ${result.statusCode}: ${result.body}`);
                failed++;
            }
        } catch (err) {
            console.log(`ERROR: ${err.message}`);
            failed++;
        }

        await new Promise((r) => setTimeout(r, 1000));
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(60));
    console.log('');
    console.log('Check your Telegram group chat for the messages!');

    server.close();
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
