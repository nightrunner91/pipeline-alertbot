const { buildMessage, buildMessageWithKeyboard } = require('../src/services/message-builder');
const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const STYLES = ['card', 'tree', 'minimal'];
const FIXTURES = ['pipeline-running.json', 'pipeline-success.json', 'pipeline-failed.json', 'pipeline-canceled.json'];

function stripHtml(html) {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#8203;/g, '');
}

function runVisualTests() {
    console.log('='.repeat(70));
    console.log('Pipeline Alertbot - Visual Style Preview');
    console.log('='.repeat(70));
    console.log('');

    for (const fixtureFile of FIXTURES) {
        const fixturePath = path.join(FIXTURES_DIR, fixtureFile);
        const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
        const status = payload.object_attributes?.status?.toUpperCase();

        console.log('─'.repeat(70));
        console.log(`📦 FIXTURE: ${fixtureFile} [${status}]`);
        console.log('─'.repeat(70));

        for (const style of STYLES) {
            console.log('');
            console.log(`  ┌─ Style: ${style.toUpperCase()}`);
            console.log('  │');

            const { message, reply_markup } = buildMessageWithKeyboard(payload, style);
            const plainText = stripHtml(message);

            plainText.split('\n').forEach((line) => {
                console.log(`  │  ${line}`);
            });

            if (reply_markup) {
                const buttonLabels = reply_markup.inline_keyboard
                    .flat()
                    .map((btn) => `[${btn.text}]`)
                    .join('  ');
                console.log(`  │`);
                console.log(`  │  ${buttonLabels}`);
            }

            console.log('  │');
            console.log('  └─────────────────────────────────────────────────────────');
        }

        console.log('');
    }
}

runVisualTests();
