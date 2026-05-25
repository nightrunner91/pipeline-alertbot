const { formatPipelineMessage, formatPipelineMessageWithKeyboard } = require('../src/services/gitlab');
const { buildMessage, formatDuration, formatStages, extractStageName } = require('../src/services/message-builder');
const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function assert(condition, message) {
    if (!condition) {
        throw new Error(`ASSERTION FAILED: ${message}`);
    }
}

function runUnitTests() {
    console.log('='.repeat(60));
    console.log('Pipeline Alertbot - Unit Test Suite');
    console.log('='.repeat(60));
    console.log('');

    let passed = 0;
    let failed = 0;

    const tests = [
        {
            name: 'Card style: Format running pipeline message',
            fixture: 'pipeline-running.json',
            style: 'card',
            assertions: (msg) => {
                assert(msg.includes('Running [build]'), 'Should contain "Running [build]"');
                assert(msg.includes('my-awesome-project'), 'Should contain project name');
                assert(msg.includes('main'), 'Should contain branch name');
                assert(msg.includes('John Doe'), 'Should contain author name');
                assert(!msg.includes('Duration'), 'Should not contain duration for running');
                assert(!msg.includes('Stages'), 'Should not contain stages line');
            },
        },
        {
            name: 'Card style: Format success pipeline message',
            fixture: 'pipeline-success.json',
            style: 'card',
            assertions: (msg) => {
                assert(msg.includes('Passed [deploy]'), 'Should contain "Passed [deploy]"');
                assert(msg.includes('\u2705'), 'Should contain success emoji');
                assert(msg.includes('15m 30s'), 'Should contain formatted duration');
                assert(!msg.includes('Stages'), 'Should not contain stages line');
            },
        },
        {
            name: 'Card style: Format failed pipeline message',
            fixture: 'pipeline-failed.json',
            style: 'card',
            assertions: (msg) => {
                assert(msg.includes('Failed [test]'), 'Should contain "Failed [test]"');
                assert(msg.includes('\u274C'), 'Should contain failure emoji');
                assert(msg.includes('feature/broken-thing'), 'Should contain feature branch');
                assert(msg.includes('Jane Smith'), 'Should contain author name');
                assert(msg.includes('5m 12s'), 'Should contain formatted duration');
                assert(!msg.includes('Stages'), 'Should not contain stages line');
            },
        },
        {
            name: 'Card style: Format canceled pipeline message',
            fixture: 'pipeline-canceled.json',
            style: 'card',
            assertions: (msg) => {
                assert(msg.includes('Canceled [build]'), 'Should contain "Canceled [build]"');
                assert(msg.includes('\u26A0\uFE0F'), 'Should contain warning emoji');
                assert(!msg.includes('Stages'), 'Should not contain stages line');
            },
        },
        {
            name: 'Tree style: Format success pipeline message',
            fixture: 'pipeline-success.json',
            style: 'tree',
            assertions: (msg) => {
                assert(msg.includes('Passed [deploy]'), 'Should contain "Passed [deploy]"');
                assert(msg.includes('\u251C\u2500'), 'Should contain tree connector');
                assert(msg.includes('\u2514\u2500'), 'Should contain last tree connector');
                assert(msg.includes('15m 30s'), 'Should contain formatted duration');
                assert(!msg.includes('Stages'), 'Should not contain stages line');
            },
        },
        {
            name: 'Tree style: Format failed pipeline message',
            fixture: 'pipeline-failed.json',
            style: 'tree',
            assertions: (msg) => {
                assert(msg.includes('Failed [test]'), 'Should contain "Failed [test]"');
                assert(msg.includes('feature/broken-thing'), 'Should contain feature branch');
                assert(!msg.includes('Stages'), 'Should not contain stages line');
            },
        },
        {
            name: 'Minimal style: Format success pipeline message',
            fixture: 'pipeline-success.json',
            style: 'minimal',
            assertions: (msg) => {
                assert(msg.includes('Passed [deploy]'), 'Should contain "Passed [deploy]"');
                assert(msg.includes('main'), 'Should contain branch');
                assert(msg.includes('John Doe'), 'Should contain author');
                assert(msg.includes('15m 30s'), 'Should contain duration');
                assert(!msg.includes('Stages'), 'Should not contain stages line');
            },
        },
        {
            name: 'HTML formatting is valid for Telegram',
            fixture: 'pipeline-running.json',
            style: 'card',
            assertions: (msg) => {
                assert(msg.includes('<b>'), 'Should contain bold tags');
                assert(msg.includes('<code>'), 'Should contain code tags');
            },
        },
        {
            name: 'Inline keyboard is generated',
            fixture: 'pipeline-success.json',
            style: 'card',
            assertions: (msg, reply_markup) => {
                assert(reply_markup, 'Should have reply_markup');
                assert(reply_markup.inline_keyboard, 'Should have inline_keyboard');
                assert(reply_markup.inline_keyboard.length === 2, 'Should have two rows');
                assert(reply_markup.inline_keyboard[0].length >= 1, 'Should have at least one button in first row');
                assert(reply_markup.inline_keyboard[0][0].text === 'Pipeline', 'First button should be "Pipeline"');
                assert(reply_markup.inline_keyboard[0][1].text === 'Commit', 'Second button should be "Commit"');
                assert(reply_markup.inline_keyboard[1].length === 1, 'Second row should have one button');
                assert(reply_markup.inline_keyboard[1][0].text === 'View repository', 'Third button should be "View repository"');
            },
            withKeyboard: true,
        },
        {
            name: 'Inline keyboard with deployLinks adds extra button',
            fixture: 'pipeline-success.json',
            style: 'card',
            assertions: (msg, reply_markup) => {
                assert(reply_markup, 'Should have reply_markup');
                assert(reply_markup.inline_keyboard, 'Should have inline_keyboard');
                assert(reply_markup.inline_keyboard.length === 3, 'Should have three rows with deployLink');
                assert(reply_markup.inline_keyboard[2].length === 1, 'Third row should have one button');
                assert(reply_markup.inline_keyboard[2][0].text === 'Open Site', 'Deploy button should show custom name');
                assert(reply_markup.inline_keyboard[2][0].url === 'https://example.com/deploy', 'Deploy button should have correct URL');
            },
            withKeyboard: true,
            deployLink: { url: 'https://example.com/deploy', name: 'Open Site' },
        },
        {
            name: 'Duration formatter works correctly',
            fixture: null,
            style: null,
            isUtility: true,
            assertions: () => {
                assert(formatDuration(312) === '5m 12s', '312s should be 5m 12s');
                assert(formatDuration(930) === '15m 30s', '930s should be 15m 30s');
                assert(formatDuration(45) === '45s', '45s should be 45s');
                assert(formatDuration(0) === '0s', '0s should be 0s');
                assert(formatDuration(null) === null, 'null should return null');
                assert(formatDuration(undefined) === null, 'undefined should return null');
            },
        },
        {
            name: 'Stages formatter works correctly',
            fixture: null,
            style: null,
            isUtility: true,
            assertions: () => {
                assert(formatStages(['build', 'test', 'deploy']) === 'build \u2192 test \u2192 deploy', 'Should format stages with arrows');
                assert(formatStages(['build']) === 'build', 'Single stage should work');
                assert(formatStages([]) === null, 'Empty array should return null');
                assert(formatStages(null) === null, 'null should return null');
            },
        },
        {
            name: 'Stage name extractor uses detailed_status.context',
            fixture: 'pipeline-running.json',
            style: null,
            isUtility: true,
            assertions: () => {
                const payload = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'pipeline-running.json'), 'utf-8'));
                assert(extractStageName(payload) === 'build', 'Should extract stage from detailed_status.context');
            },
        },
        {
            name: 'Stage name extractor falls back to first stage',
            fixture: null,
            style: null,
            isUtility: true,
            assertions: () => {
                const payload = { object_attributes: { stages: ['test', 'deploy'] } };
                assert(extractStageName(payload) === 'test', 'Should fall back to first stage');
            },
        },
        {
            name: 'Stage name extractor falls back to "pipeline"',
            fixture: null,
            style: null,
            isUtility: true,
            assertions: () => {
                const payload = { object_attributes: {} };
                assert(extractStageName(payload) === 'pipeline', 'Should fall back to "pipeline"');
            },
        },
        {
            name: 'projectName override replaces project name in message',
            fixture: 'pipeline-running.json',
            style: 'card',
            assertions: (msg) => {
                assert(msg.includes('Custom Project Name'), 'Should contain custom project name');
                assert(!msg.includes('my-awesome-project'), 'Should not contain original project name');
            },
            projectNameOverride: 'Custom Project Name',
        },
    ];

    for (const test of tests) {
        process.stdout.write(`Testing: ${test.name}... `);

        try {
            if (test.isUtility) {
                test.assertions();
                console.log('PASS');
                passed++;
                continue;
            }

            const fixturePath = path.join(FIXTURES_DIR, test.fixture);
            const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

            if (test.withKeyboard) {
                const { message, reply_markup } = formatPipelineMessageWithKeyboard(payload, test.style, test.projectNameOverride, test.deployLink);
                test.assertions(message, reply_markup);
            } else {
                const message = formatPipelineMessage(payload, test.style, test.projectNameOverride);
                test.assertions(message);
            }

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

runUnitTests();
