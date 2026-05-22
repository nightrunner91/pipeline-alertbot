const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const WEBHOOK_PATH = '/api/webhook/gitlab';
const WEBHOOK_SECRET = process.env.GITLAB_WEBHOOK_SECRET || '';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function sendWebhook(options = {}) {
    const { payload, secretToken, expectStatus } = options;

    return new Promise((resolve, reject) => {
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
        };

        if (secretToken !== undefined) {
            headers['X-Gitlab-Token'] = secretToken;
        }

        const reqOptions = {
            hostname: 'localhost',
            port: process.env.PORT || 3000,
            path: WEBHOOK_PATH,
            method: 'POST',
            headers,
        };

        const req = http.request(reqOptions, (res) => {
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

async function runSecurityTests() {
    console.log('='.repeat(60));
    console.log('Pipeline Alertbot - Security Test Suite');
    console.log('='.repeat(60));
    console.log(`Target: ${BASE_URL}${WEBHOOK_PATH}`);
    console.log('');

    let passed = 0;
    let failed = 0;

    const pipelinePayload = fs.readFileSync(path.join(FIXTURES_DIR, 'pipeline-failed.json'), 'utf-8');

    const securityTests = [
        {
            name: 'Valid secret token',
            payload: pipelinePayload,
            secretToken: WEBHOOK_SECRET,
            expectStatus: 200,
        },
        {
            name: 'Wrong secret token (should be rejected)',
            payload: pipelinePayload,
            secretToken: 'wrong-secret-token',
            expectStatus: 401,
        },
        {
            name: 'No secret token (should be rejected if secret is configured)',
            payload: pipelinePayload,
            secretToken: undefined,
            expectStatus: WEBHOOK_SECRET ? 401 : 200,
        },
    ];

    for (const test of securityTests) {
        process.stdout.write(`Testing: ${test.name}... `);

        try {
            const result = await sendWebhook({
                payload: test.payload,
                secretToken: test.secretToken,
            });

            if (result.statusCode === test.expectStatus) {
                console.log(`PASS (HTTP ${result.statusCode} as expected)`);
                passed++;
            } else {
                console.log(`FAIL (expected HTTP ${test.expectStatus}, got HTTP ${result.statusCode})`);
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

runSecurityTests();
