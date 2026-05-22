# Pipeline Alertbot

> Real-time GitLab CI/CD pipeline notifications delivered to Telegram.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D18-43853D?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=flat&logo=telegram&logoColor=white)
![GitLab](https://img.shields.io/badge/GitLab-FC6D26?style=flat&logo=gitlab&logoColor=white)

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Alert Styles](#alert-styles)
  - [GitLab Webhook Setup](#gitlab-webhook-setup)
  - [Railway Deployment](#railway-deployment)
- [Usage](#usage)
  - [Running Locally](#running-locally)
  - [Webhook Endpoint](#webhook-endpoint)
  - [Diagnostics Endpoint](#diagnostics-endpoint)
- [Testing](#testing)
- [Development](#development)
- [License](#license)

## Project Overview

**Pipeline Alertbot** is a lightweight, production-ready webhook relay that bridges GitLab CI/CD pipeline events to Telegram group chats. It receives pipeline webhooks from GitLab, formats them into readable notifications, and sends them to a designated Telegram chat in real time.

The bot is designed for teams that want immediate visibility into their CI/CD pipelines without leaving Telegram. It supports multiple notification styles, secure webhook validation, and deploys seamlessly to platforms like Railway.

## Features

- **Real-time pipeline alerts** -- Receive instant notifications for running, successful, failed, and canceled pipelines
- **Three notification styles** -- Choose between card, badge, or minimal message formats via `ALERT_STYLE`
- **Inline keyboard buttons** -- Quick-access links to the pipeline, commit, and repository directly in Telegram
- **Secure webhook validation** -- Validates incoming requests using GitLab's secret token header
- **Multi-port binding** -- Automatically binds to multiple ports for compatibility with Railway's dynamic port routing
- **Graceful error handling** -- Global uncaught exception and unhandled rejection handlers prevent silent crashes
- **Diagnostics endpoint** -- Health check endpoint that reports configuration status without exposing secrets
- **Zero-downtime startup** -- Bot initializes independently from the webhook server; missing credentials do not block server startup

## Tech Stack

| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org/) >= 18 | JavaScript runtime |
| [Express 5](https://expressjs.com/) | Webhook HTTP server |
| [Telegraf](https://telegraf.js.org/) | Telegram Bot API client |
| [dotenv](https://github.com/motdotla/dotenv) | Environment variable loading |

## Project Structure

```
pipeline-alertbot/
├── src/
│   ├── index.js              # Entry point: config, initialization, multi-port startup
│   ├── bot/
│   │   └── index.js          # Telegraf bot creation and message dispatch
│   ├── server/
│   │   └── index.js          # Express server: routes, webhook validation, payload handling
│   ├── services/
│   │   ├── gitlab.js         # GitLab payload formatting entry point
│   │   └── message-builder.js # Message templates (card, badge, minimal) and HTML escaping
│   └── utils/
│       └── logger.js         # Structured JSON logging (INFO/ERROR)
├── test/
│   ├── fixtures/             # Sample GitLab webhook payloads
│   │   ├── pipeline-running.json
│   │   ├── pipeline-success.json
│   │   ├── pipeline-failed.json
│   │   └── pipeline-canceled.json
│   ├── test-unit.js          # Unit tests for message formatting
│   ├── test-webhooks.js      # Webhook integration tests
│   └── test-security.js      # Security validation tests
├── index.js                  # Root entry point (re-exports src/index.js)
├── railway.json              # Railway deployment configuration
├── package.json              # Dependencies and npm scripts
└── .env.example              # Environment variable template (create your own)
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm (bundled with Node.js)
- A Telegram bot token from [@BotFather](https://t.me/botfather)
- A Telegram group or channel ID where notifications will be sent
- A GitLab project with webhook configuration access

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-org/pipeline-alertbot.git
   cd pipeline-alertbot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file from the template below:

   ```bash
   cp .env.example .env   # or create .env manually
   ```

### Quick Start

1. Fill in your `.env` file with the required credentials (see [Configuration](#configuration)).
2. Start the application:

   ```bash
   npm start
   ```

3. Configure a GitLab webhook pointing to your server URL (see [GitLab Webhook Setup](#gitlab-webhook-setup)).
4. Trigger a pipeline in GitLab and watch the notification appear in Telegram.

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | -- | Bot token obtained from [@BotFather](https://t.me/botfather) |
| `TELEGRAM_GROUP_ID` | Yes | -- | Target chat ID (e.g., `-1001234567890` for groups) |
| `GITLAB_WEBHOOK_SECRET` | Yes | -- | Secret token for validating incoming GitLab webhooks |
| `ALERT_STYLE` | No | `card` | Message format: `card`, `badge`, or `minimal` |
| `PORT` | No | `3000` | Primary port for the webhook server |

> [!IMPORTANT]
> Never commit your `.env` file. It is listed in `.gitignore` and should only exist locally or in your deployment platform's secret store.

### Alert Styles

The `ALERT_STYLE` variable controls how pipeline notifications appear in Telegram:

| Style | Description | Example Output |
|---|---|---|
| `card` | Clean card layout with bold labels and monospaced values | Status header, project name, branch, commit, author, duration |
| `badge` | Structured list with tree-style connectors and a "View in GitLab" link | Badge header, tree-formatted fields, commit message, inline link |
| `minimal` | Compact single-line format with inline metadata | Status + project, inline branch/commit/author, "Open Pipeline" link |

All styles include an inline keyboard with buttons linking to the pipeline, commit, and repository.

### GitLab Webhook Setup

1. Open your GitLab project and navigate to **Settings > Webhooks**.
2. Set the **URL** to your deployed endpoint:

   ```
   https://your-domain.com/api/webhook/gitlab
   ```

3. Set the **Secret token** to the exact value of `GITLAB_WEBHOOK_SECRET` from your `.env` file.
4. Under **Trigger**, check **Pipeline events**.
5. Keep **Enable SSL verification** enabled for production deployments.
6. Click **Add webhook** and test using the **Test > Pipeline events** dropdown.

> [!NOTE]
> The bot only processes pipeline events with statuses: `running`, `success`, `failed`, and `canceled`. Other events are acknowledged but ignored.

### Railway Deployment

The project includes a `railway.json` configuration for one-click deployment to [Railway](https://railway.com/):

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node src/index.js"
  }
}
```

To deploy:

1. Push the repository to GitHub.
2. Connect the repository in your Railway dashboard.
3. Add the required environment variables in Railway's variable editor.
4. Railway will automatically build and deploy using Nixpacks.

The server binds to multiple ports (`3000`, `8080`, `5000`, `8000`, `4000`, `80`, `5952`) to handle Railway's dynamic port assignment.

## Usage

### Running Locally

```bash
npm start
```

Expected output:

```json
{"level":"INFO","timestamp":"2026-05-22T12:00:00.000Z","message":"Telegram bot initialized successfully","context":{}}
{"level":"INFO","timestamp":"2026-05-22T12:00:00.000Z","message":"Starting webhook server...","context":{}}
{"level":"INFO","timestamp":"2026-05-22T12:00:00.000Z","message":"Webhook server listening on 0.0.0.0:3000","context":{}}
```

### Webhook Endpoint

- **URL**: `POST /api/webhook/gitlab`
- **Headers**: `X-Gitlab-Token: <your-secret>`
- **Body**: GitLab pipeline event payload (JSON)
- **Response**: `200 OK` on success, `401 Unauthorized` if the secret token does not match, `500` if bot or group ID is missing

### Diagnostics Endpoint

- **URL**: `GET /`
- **Response**: JSON object with server status and configuration presence (no secrets exposed)

```json
{
  "status": "running",
  "env": {
    "PORT": 3000,
    "HAS_TELEGRAM_BOT_TOKEN": true,
    "HAS_TELEGRAM_GROUP_ID": true,
    "HAS_GITLAB_WEBHOOK_SECRET": true,
    "ALERT_STYLE": "card"
  },
  "botInitialized": true
}
```

## Testing

Run the full test suite:

```bash
npm test
```

This executes three test suites in sequence:

| Script | Description |
|---|---|
| `npm run test:unit` | Unit tests for message formatting, duration parsing, and stage formatting |
| `npm run test:webhooks` | Webhook integration tests with sample payloads |
| `npm run test:security` | Security validation tests (token verification, input sanitization) |

Tests use fixture files in `test/fixtures/` that simulate real GitLab pipeline event payloads.

## Development

### Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the application |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:webhooks` | Run webhook tests only |
| `npm run test:security` | Run security tests only |

### Adding a New Alert Style

1. Open `src/services/message-builder.js`.
2. Create a new formatter function (e.g., `formatCompactStyle(data)`).
3. Add a case in the `buildMessage()` switch statement.
4. Add corresponding tests in `test/test-unit.js` using an existing or new fixture.
5. Run `npm test` to verify.

### Logging

The application uses structured JSON logging via `src/utils/logger.js`. All log entries include a `level`, `timestamp`, `message`, and optional `context`. Errors additionally include `error` and `stack` fields. Logs are written to `stdout` (INFO) and `stderr` (ERROR) for easy integration with log aggregators.

## License

This project is licensed under the [ISC License](LICENSE).
