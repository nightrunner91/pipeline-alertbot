const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const WEBHOOK_PATH = '/api/webhook/gitlab';
const WEBHOOK_SECRET = process.env.GITLAB_WEBHOOK_SECRET || '';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

const tests = [
    {
        name: 'Pipeline Running',
        file: 'pipeline-running.json',
        expectAlert: true,
    },
    {
        name: 'Pipeline Success',
        file: 'pipeline-success.json',
        expectAlert: true,
    },
    {
        name: 'Pipeline Failed',
        file: 'pipeline-failed.json',
        expectAlert: true,
    },
    {
        name: 'Pipeline Canceled',
        file: 'pipeline-canceled.json',
        expectAlert: true,
    },
    {
        name: 'Push Event (should be ignored)',
        file: 'push-event.json',
        expectAlert: false,
    },
    {
        name: 'Job Running',
        file: 'job-running.json',
        expectAlert: true,
    },
    {
        name: 'Job Success',
        file: 'job-success.json',
        expectAlert: true,
    },
    {
        name: 'Job Failed',
        file: 'job-failed.json',
        expectAlert: true,
    },
    {
        name: 'Job Canceled',
        file: 'job-canceled.json',
        expectAlert: true,
    },
];

function sendWebhook(testCase) {
    return new Promise((resolve, reject) => {
        const fixturePath = path.join(FIXTURES_DIR, testCase.file);
        const payload = fs.readFileSync(fixturePath, 'utf-8');

        const options = {
            hostname: 'localhost',
            port: process.env.PORT || 3000,
            path: WEBHOOK_PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        };

        if (WEBHOOK_SECRET) {
            options.headers['X-Gitlab-Token'] = WEBHOOK_SECRET;
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

        req.on('error', (err) => {
            reject(err);
        });

        req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('Pipeline Alertbot - Local Webhook Test Suite');
    console.log('='.repeat(60));
    console.log(`Target: ${BASE_URL}${WEBHOOK_PATH}`);
    console.log(`Secret configured: ${WEBHOOK_SECRET ? 'Yes' : 'No'}`);
    console.log('');

    let passed = 0;
    let failed = 0;

    for (const testCase of tests) {
        process.stdout.write(`Testing: ${testCase.name}... `);

        try {
            const result = await sendWebhook(testCase);

            if (result.statusCode === 200) {
                console.log(`PASS (HTTP ${result.statusCode})`);
                passed++;
            } else {
                console.log(`FAIL (HTTP ${result.statusCode}: ${result.body})`);
                failed++;
            }
        } catch (err) {
            console.log(`ERROR: ${err.message}`);
            console.log('  Is the server running? Start it with: npm start');
            failed++;
        }

        await new Promise((r) => setTimeout(r, 500));
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
