# AI Playwright Agent Workspace

Autonomous AI Website QA Agent Workspace - A monorepo for automated website quality assurance using AI and Playwright.

## Project Structure

This is a pnpm workspace monorepo managed by Turbo, containing:

- **apps/api** - Backend API server
- **apps/web** - Frontend web application
- **packages/ai-provider** - AI provider abstraction layer
- **packages/playwright-agent** - Playwright automation agent

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v9.0.0 or higher)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TestFlux
   ```

2. **Install pnpm** (if not already installed)
   ```bash
   npm install -g pnpm@9.0.0
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file and configure the following:
   - `PORT` - Server port (default: 3001)
   - `AI_PROVIDER` - Choose between 'claude' or 'openai' (default: claude)
   - `ANTHROPIC_API_KEY` - Your Anthropic API key (optional, falls back to mock QA if blank)
   - `OPENAI_API_KEY` - Your OpenAI API key (optional, falls back to mock QA if blank)
   - `JWT_SECRET` - JWT secret for authentication (change in production)
   - `NEXT_PUBLIC_API_URL` - Frontend API URL (default: http://localhost:3001)
   
   Optional configurations:
   - Database: Defaults to SQLite, can configure PostgreSQL/MySQL
   - Redis: Disabled by default, enable for distributed queue processing
   - Storage: Defaults to local filesystem, can configure Cloudflare R2

## Development

1. **Start all services in development mode**
   ```bash
   pnpm dev
   ```
   
   This will start both the API and web applications in parallel.

2. **Build all packages**
   ```bash
   pnpm build
   ```

3. **Run linting**
   ```bash
   pnpm lint
   ```

4. **Run tests**
   ```bash
   pnpm test
   ```

## Usage

Once the development server is running:
- API server: http://localhost:3001
- Web application: http://localhost:3000 (default Next.js port)

## Features

- **AI-Powered QA Analysis**: Uses Claude or OpenAI for intelligent website testing
- **Playwright Automation**: Automated browser testing and screenshot capture
- **Zero-Config Setup**: Works out of the box with SQLite and local storage
- **Flexible AI Providers**: Switch between Claude and OpenAI or use mock mode
- **Scalable Architecture**: Monorepo structure with shared packages
- **Cloud Storage Support**: Optional Cloudflare R2 integration for artifact storage

## Configuration Options

### Database
- **Default**: SQLite (zero-config)
- **Options**: PostgreSQL, MySQL (configure in `.env`)

### Queue System
- **Default**: In-memory (single instance)
- **Options**: Redis (for distributed processing)

### Storage
- **Default**: Local filesystem
- **Options**: Cloudflare R2 (configure R2 credentials in `.env`)

### AI Provider
- **Default**: Claude (Anthropic)
- **Options**: OpenAI, or mock mode (no API key required)

## License

Private workspace
