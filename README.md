# Pipeline Alertbot

> Real-time GitLab CI/CD Pipeline Notifications in Telegram.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node](https://img.shields.io/badge/node.js-%2343853D.svg?style=flat&logo=node-dot-js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=flat&logo=express&logoColor=%2361DAFB)
![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=flat&logo=telegram&logoColor=white)

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [GitLab Webhook Setup](#gitlab-webhook-setup)
- [Usage](#usage)
- [Development](#development)
- [License](#license)

## Project Overview

**Pipeline Alertbot** is a robust, production-ready Telegram bot designed to monitor corporate GitLab CI/CD pipelines. It bridges the gap between your development workflows and team communication by securely receiving webhook events from GitLab and dispatching real-time updates directly to a designated Telegram group. Never miss a pipeline failure or deployment success again.

## Features

- **Real-Time Notifications**: Instantly receive alerts for pipeline starts, successes, and failures in Telegram.
- **Secure Webhooks**: Validates incoming GitLab webhooks using a secret token to prevent unauthorized access.
- **Asynchronous Architecture**: Built on Node.js and Express to handle concurrent webhook deliveries efficiently without blocking.
- **Easy Configuration**: Simple, environment-variable-driven setup.

## Tech Stack

- **[Node.js](https://nodejs.org/)**: JavaScript runtime environment.
- **[Express](https://expressjs.com/)**: Fast, unopinionated, minimalist web framework for the webhook server.
- **[Telegraf](https://telegraf.js.org/)**: Modern Telegram Bot API framework for Node.js.
- **[dotenv](https://github.com/motdotla/dotenv)**: Zero-dependency module that loads environment variables.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine or server.

### Prerequisites

- Node.js (v14 or higher recommended)
- A Telegram Bot Token (obtained from [@BotFather](https://t.me/botfather))
- The ID of the Telegram group where notifications should be sent
- A GitLab repository to configure webhooks

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/pipeline-alertbot.git
    cd pipeline-alertbot
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    Create a `.env` file in the root directory and populate it with your specific credentials (see the [Configuration](#configuration) section).

## Configuration

### Environment Variables

Create a `.env` file in the root directory. The application requires the following variables to operate:

```ini
# The token provided by Telegram @BotFather
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# The ID of the Telegram group to send notifications to (e.g., -1001234567890)
TELEGRAM_GROUP_ID=your_telegram_group_id

# A secret string used to validate incoming webhooks from GitLab
GITLAB_WEBHOOK_SECRET=your_secure_random_secret

# (Optional) The port the Express server will listen on (defaults to 3000)
PORT=3000
```

> [!IMPORTANT]
> Ensure your `TELEGRAM_GROUP_ID` is correct. You may need to add your bot to the group first and send a test message to retrieve the correct ID.

### GitLab Webhook Setup

1. Navigate to your GitLab repository.
2. Go to **Settings > Webhooks**.
3. Set the **URL** to your deployed server's endpoint (e.g., `https://your-domain.com/`). Note: The exact route may depend on your Express configuration, typically the root `/` or `/webhook`.
4. Set the **Secret token** to the exact value you defined in `GITLAB_WEBHOOK_SECRET`.
5. Under **Triggers**, select **Pipeline events**.
6. Disable SSL verification if you are testing locally without HTTPS (not recommended for production).
7. Click **Add webhook**.

## Usage

To start the bot and the webhook server locally, run:

```bash
npm start
```

You should see the following output indicating successful startup:

```
Telegram bot started
Webhook server listening on port 3000
```

The server is now ready to receive payloads from GitLab and forward formatted messages to your Telegram group.

## Development

The project structure is organized as follows:
- `src/index.js`: Main entry point initializing the bot and server.
- `src/bot/`: Telegraf bot configuration and handlers.
- `src/server/`: Express web server and route definitions.
- `src/services/`: Core logic for parsing GitLab payloads and formatting messages.
- `src/utils/`: Utility functions (e.g., logging).

To contribute or run tests (currently unavailable), you can modify the core logic within the `src/` directory.

## License

This project is licensed under the ISC License.
