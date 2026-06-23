# AI Playwright Agent Workspace

Autonomous AI Website QA Agent Workspace - A monorepo for automated website quality assurance using AI and Playwright.

## Project Structure

This is a pnpm workspace monorepo managed by Turbo, containing:

- **apps/api** - Backend API server
- **apps/web** - Frontend web application
- **packages/ai-provider** - AI provider abstraction layer
- **packages/playwright-agent** - Playwright automation agent

## Quick AI Provider Setup

| Provider | AI_PROVIDER Value | API Key Variable | Speed | Cost | Get API Key |
|----------|------------------|------------------|-------|-------|--------------|
| **Claude** | `claude` | `ANTHROPIC_API_KEY` | Medium | Medium | [console.anthropic.com](https://console.anthropic.com/) |
| **OpenAI** | `openai` | `OPENAI_API_KEY` | Fast | Medium-High | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Groq** | `groq` | `GROQ_API_KEY` | Very Fast | Low | [console.groq.com](https://console.groq.com/) |
| **Mock** | `mock` | None | Instant | Free | No API key needed |

**Quick Start Example:**
```bash
# For Claude
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your_key_here

# For OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here

# For Groq (fastest)
AI_PROVIDER=groq
GROQ_API_KEY=your_key_here

# For testing without API costs
AI_PROVIDER=mock
```

## Quick Storage Setup

| Storage Type | Configuration Required | Cost | Egress Fees | Best For |
|-------------|-------------------------|-------|-------------|----------|
| **Local Filesystem** | None (default) | Free | N/A | Development, Testing |
| **Cloudflare R2** | R2 credentials | Free tier + low | $0 (unlimited) | Production, Scale |
| **AWS S3** | AWS credentials | Pay-as-you-go | $$$ (expensive) | Enterprise, Existing AWS |

**Quick Start Example:**
```bash
# For Local Storage (default)
# No configuration needed

# For Cloudflare R2 (recommended)
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_ACCOUNT_ID=your_account_id
R2_BUCKET_NAME=playwright-artifacts
```

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

4. **Install Playwright browsers** (required for automated testing)
   ```bash
   pnpm exec playwright install chromium
   # Optional: install other browsers
   pnpm exec playwright install firefox
   pnpm exec playwright install webkit
   ```

5. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file and configure the following:
   
   **Required for AI-powered testing:**
   - `AI_PROVIDER` - Choose your AI provider (options: claude, openai, groq, mock)
   
   **API Keys (configure based on your chosen provider):**
   - `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude (required if using claude)
   - `OPENAI_API_KEY` - Your OpenAI API key for GPT models (required if using openai)
   - `GROQ_API_KEY` - Your Groq API key for fast inference (required if using groq)
   
   **Optional configurations:**
   - `PORT` - Server port (default: 3001)
   - `JWT_SECRET` - JWT secret for authentication (change in production)
   - `NEXT_PUBLIC_API_URL` - Frontend API URL (default: http://localhost:3001)
   - `PLAYWRIGHT_HEADLESS` - Set to 'false' for visible browser window (default: true)
   
   **Infrastructure options:**
   - Database: Defaults to SQLite, can configure PostgreSQL/MySQL
   - Redis: Disabled by default, enable for distributed queue processing
   - Storage: Defaults to local filesystem, can configure Cloudflare R2/S3 for cloud storage

## Cloud Storage Configuration

### Cloudflare R2 (Recommended)

Cloudflare R2 is an S3-compatible object storage service with zero egress fees, perfect for storing screenshots and test artifacts.

#### R2 Setup Steps

1. **Create Cloudflare Account**
   - Go to https://dash.cloudflare.com/
   - Sign up for a free account

2. **Create R2 Bucket**
   - Navigate to R2 → Create Bucket
   - Choose a bucket name (e.g., `playwright-artifacts`)
   - Select location (default is recommended)

3. **Get R2 Credentials**
   - Go to R2 → Manage R2 API Tokens
   - Click "Create API Token"
   - Give it a descriptive name (e.g., "Playwright Artifacts")
   - Select permissions: "Object Read & Write"
   - Note down your:
     - Access Key ID
     - Secret Access Key
     - Account ID (available in R2 dashboard URL)

4. **Configure Environment Variables**
   Add these to your `.env` file:
   ```bash
   # Cloudflare R2 Configuration
   R2_ACCESS_KEY_ID=your_access_key_id
   R2_SECRET_ACCESS_KEY=your_secret_access_key
   R2_ACCOUNT_ID=your_account_id
   R2_BUCKET_NAME=playwright-artifacts
   R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # Optional: for public bucket access
   ```

5. **Test R2 Configuration**
   ```bash
   # Restart the server to apply changes
   pnpm dev
   # Check logs for "R2 storage client initialized."
   ```

#### R2 Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `R2_ACCESS_KEY_ID` | R2 API Access Key ID | Yes | `abc123def456` |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret Access Key | Yes | `xyz789uvw012` |
| `R2_ACCOUNT_ID` | Cloudflare Account ID | Yes | `123456789abc` |
| `R2_BUCKET_NAME` | R2 bucket name | No (default: `playwright-artifacts`) | `my-test-artifacts` |
| `R2_PUBLIC_URL` | Public URL for bucket | No (auto-generated) | `https://pub-xxxxx.r2.dev` |

#### R2 Public Access (Optional)

If you want to make your artifacts publicly accessible:

1. **Create Public Bucket**
   - In R2 dashboard, go to your bucket
   - Click "Settings" → "Public Access"
   - Enable public access for the bucket

2. **Configure Public URL**
   ```bash
   R2_PUBLIC_URL=https://pub-xxxxxxxxx.r2.dev
   ```

3. **Custom Domain (Advanced)**
   - Configure custom domain in Cloudflare
   - Update `R2_PUBLIC_URL` accordingly

### AWS S3 Configuration

The system also supports AWS S3 as an alternative to Cloudflare R2.

#### S3 Setup Steps

1. **Create AWS Account**
   - Go to https://aws.amazon.com/
   - Sign up for an AWS account

2. **Create S3 Bucket**
   - Navigate to S3 → Create bucket
   - Choose bucket name (must be globally unique)
   - Select region
   - Configure permissions (public read access for artifacts)

3. **Get AWS Credentials**
   - Go to IAM → Users → Create user
   - Attach "AmazonS3FullAccess" policy (or more restrictive)
   - Create access key
   - Note down Access Key ID and Secret Access Key

4. **Configure Environment Variables**
   ```bash
   # AWS S3 Configuration (Alternative to R2)
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   AWS_BUCKET_NAME=your-s3-bucket-name
   AWS_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
   ```

5. **Update Storage Service**
   The storage service needs to be updated to support AWS S3. Currently it's configured for R2, but the pattern is similar.

### Storage Comparison

| Feature | Local Filesystem | Cloudflare R2 | AWS S3 |
|---------|-----------------|---------------|---------|
| **Setup** | Zero-config | Simple setup | Moderate setup |
| **Cost** | Free | Free tier + low egress | Pay-as-you-go |
| **Egress Fees** | N/A | $0 (unlimited) | $$$ (expensive) |
| **Performance** | Fast | Fast | Fast |
| **Scalability** | Limited | Unlimited | Unlimited |
| **Redundancy** | Manual | Built-in | Built-in |
| **CDN Integration** | No | Built-in | Via CloudFront |
| **Recommended** | Development | Production | Production |

### Storage Fallback Behavior

The system uses intelligent fallback:

1. **Primary**: Cloudflare R2 (if configured)
2. **Fallback**: Local filesystem (if R2 fails or not configured)
3. **Automatic**: Seamless switching without service interruption

**Error Handling**:
- If R2 upload fails, automatically falls back to local storage
- Logs the error for debugging
- Continues test execution without interruption

### Local Storage Configuration

For local filesystem storage (default, no configuration needed):

```bash
# Optional: Specify custom local storage directory
STORAGE_DIR=./uploads
```

**Local Storage Features:**
- Zero configuration required
- Automatic directory creation
- Suitable for development and testing
- Files stored in `uploads/` directory by default
- Served via NestJS static file serving

**When to Use Local Storage:**
- Development and testing
- Offline environments
- Cost-sensitive projects
- Data privacy requirements (keep data local)
- Proof of concept projects

### Verifying Storage Configuration

**Test Cloudflare R2 Configuration:**
```bash
# Check logs for R2 initialization
pnpm dev
# Look for: "R2 storage client initialized."

# Run a test with screenshots
# Check that artifacts are uploaded to R2
# Verify public URL access if configured
```

**Test Local Storage Configuration:**
```bash
# Check logs for local storage initialization
pnpm dev
# Look for: "Local storage fallback initialized. Target directory: uploads"

# Run a test with screenshots
# Check that files appear in uploads/ directory
# Verify files are accessible via the API
```

**Storage Configuration Checklist:**
- ✅ R2 credentials are correctly set in `.env`
- ✅ R2 bucket exists and is accessible
- ✅ R2 account ID is correct
- ✅ Logs show "R2 storage client initialized"
- ✅ Test uploads are successful
- ✅ Screenshots are accessible via URLs

## AI Provider Configuration

Choose from the following AI providers by setting `AI_PROVIDER` and the corresponding API key:

### 1. **Claude (Anthropic)** - `AI_PROVIDER=claude`
- **API Key**: `ANTHROPIC_API_KEY`
- **Best for**: Complex reasoning, detailed analysis
- **Speed**: Medium
- **Cost**: Medium
- **Models**: Claude 3.5 Sonnet, Claude 3 Opus
- **Get API Key**: https://console.anthropic.com/
- **Configuration**:
  ```
  AI_PROVIDER=claude
  ANTHROPIC_API_KEY=your_anthropic_api_key_here
  ```

### 2. **OpenAI** - `AI_PROVIDER=openai`
- **API Key**: `OPENAI_API_KEY`
- **Best for**: Fast response, good accuracy
- **Speed**: Fast
- **Cost**: Medium-High
- **Models**: GPT-4, GPT-4 Turbo, GPT-3.5
- **Get API Key**: https://platform.openai.com/api-keys
- **Configuration**:
  ```
  AI_PROVIDER=openai
  OPENAI_API_KEY=your_openai_api_key_here
  ```

### 3. **Groq** - `AI_PROVIDER=groq`
- **API Key**: `GROQ_API_KEY`
- **Best for**: Ultra-fast inference, cost-effective
- **Speed**: Very Fast
- **Cost**: Low
- **Models**: Llama 3, Mixtral, Gemma
- **Get API Key**: https://console.groq.com/
- **Configuration**:
  ```
  AI_PROVIDER=groq
  GROQ_API_KEY=your_groq_api_key_here
  ```

### 4. **Mock Mode** - `AI_PROVIDER=mock`
- **API Key**: None required
- **Best for**: Testing without API costs, local development
- **Speed**: Instant (simulated)
- **Cost**: Free
- **Models**: Simulated responses
- **Configuration**:
  ```
  AI_PROVIDER=mock
  # No API key needed
  ```

### AI Provider Selection Guide

**Use Claude when:**
- You need detailed reasoning and analysis
- Budget allows medium cost
- You want the most accurate bug detection

**Use OpenAI when:**
- You need fast response times
- You prefer GPT models
- Budget allows medium-high cost

**Use Groq when:**
- You want the fastest possible results
- Cost is a primary concern
- You're okay with newer, less tested models

**Use Mock when:**
- Testing the system without API costs
- Local development and debugging
- API keys are not yet available

### Switching AI Providers

To switch between AI providers:

1. **Edit `.env` file:**
   ```bash
   # Current provider
   AI_PROVIDER=claude
   ANTHROPIC_API_KEY=your_key
   
   # Switch to OpenAI
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_openai_key
   
   # Switch to Groq (for speed)
   AI_PROVIDER=groq
   GROQ_API_KEY=your_groq_key
   
   # Switch to Mock (for testing)
   AI_PROVIDER=mock
   # Remove API keys for mock mode
   ```

2. **Restart the development server:**
   ```bash
   # Stop the current server (Ctrl+C)
   pnpm dev
   ```

3. **Configure per-project (optional):**
   - Navigate to project settings in the web UI
   - Select preferred AI provider for specific projects
   - Different projects can use different AI providers

### AI Provider Comparison

| Feature | Claude | OpenAI | Groq | Mock |
|---------|--------|--------|------|------|
| **Reasoning Quality** | Excellent | Good | Good | Simulated |
| **Response Speed** | Medium | Fast | Very Fast | Instant |
| **Cost Efficiency** | Medium | Medium-High | Low | Free |
| **Model Variety** | Claude 3.x | GPT-4.x | Llama 3.x | Basic |
| **API Complexity** | Simple | Simple | Simple | None |
| **Recommended For** | Production use | General use | Cost-sensitive | Development |

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

### 🤖 AI-Powered Testing
- **AI-Powered QA Analysis**: Uses Claude, OpenAI, or Groq for intelligent website testing
- **Flexible AI Providers**: Switch between Claude, OpenAI, Groq, or use mock mode
- **Zero-Config Setup**: Works out of the box with SQLite and local storage

### 🎭 Browser Automation
- **Playwright Automation**: Automated browser testing with Chromium, Firefox, or WebKit
- **Screenshot Capture**: Automatic screenshots for visual debugging
- **Network Monitoring**: Tracks network failures and console errors

### 🧪 Testing Capabilities
- **Site Crawling**: BFS-based site exploration with configurable depth and pages
- **Scenario Testing**: User-defined step execution for specific user flows
- **Duplicate Button Handling**: Advanced selection strategies for elements with same text
- **Direct Element Selection**: Click by ID, testid, CSS selector, or attributes
- **File Upload Support**: Upload images and documents in test scenarios

### 🔍 SEO Analysis
- **Comprehensive SEO Checks**: 15+ SEO categories analyzed during crawling
- **Title & Meta Tags**: Page title, meta description, canonical tags validation
- **Social Media Optimization**: Open Graph and Twitter Card tag detection
- **Structured Data**: JSON-LD and schema markup validation
- **Content Analysis**: Heading structure, content length, mobile optimization
- **SEO Issue Export**: Download detailed SEO reports as JSON

### 📊 Reporting & Analysis
- **Bug Detection**: Console errors, network failures, accessibility issues
- **SEO Issues Tracking**: Store and categorize SEO problems by severity
- **Run Session Export**: Download complete test results including bugs and SEO issues
- **Visual Debugging**: Screenshots and step-by-step execution traces

### 🔧 Infrastructure
- **Scalable Architecture**: Monorepo structure with shared packages
- **Cloud Storage Support**: Cloudflare R2 with zero egress fees, AWS S3, or local filesystem
- **Database Options**: SQLite (default), PostgreSQL, MySQL
- **Queue System**: In-memory (default) or Redis for distributed processing
- **Automatic Fallback**: Seamless switching between cloud and local storage

## Test Scenario Instructions

### Basic Actions
```json
[
  "Open https://example.com",
  "Click Submit",
  "Fill name John Doe",
  "Fill email john@example.com"
]
```

### Navigation
```json
[
  "Open https://example.com",
  "Go back",
  "Go forward",
  "Open https://example.com/contact"
]
```

### Enhanced Button Selection

#### Index-Based Selection
```json
[
  "Click the 1st Submit button",
  "Click the 2nd Save button",
  "Click the 3rd Cancel button"
]
```

#### Position-Based Selection
```json
[
  "Click the first Submit button",
  "Click the last Submit button",
  "Click the top Save button",
  "Click the bottom Cancel button"
]
```

#### Context-Based Selection
```json
[
  "Click Submit in the login form",
  "Click Save in the header",
  "Click Delete in the settings panel"
]
```

### Direct Element Selection

#### By ID/TestID
```json
[
  "Click button with id 'primary-submit'",
  "Click element with testid 'submit-btn'",
  "Click button with data-testid 'save-action'"
]
```

#### By CSS Selector
```json
[
  "Click #submit-btn",
  "Click .btn-primary",
  "Click [data-cy='submit']"
]
```

### File Upload
```json
[
  "Open https://example.com/upload",
  "Upload C:/Users/test/image.jpg",
  "Upload C:/Users/test/document.pdf to file-input",
  "Upload C:/Users/test/photo.jpg with description 'Profile picture'"
]
```

### Advanced Scenarios

#### Form Testing
```json
[
  "Open https://example.com/form",
  "Fill username testuser",
  "Fill password secret123",
  "Click button with id 'submit-form'",
  "Assert text Success"
]
```

#### Multi-Step Workflow
```json
[
  "Open https://example.com/dashboard",
  "Click the first Create button",
  "Fill project-name My Project",
  "Upload C:/Users/test/logo.png to logo-upload",
  "Click Save in the modal",
  "Assert text Project created successfully"
]
```

## SEO Analysis Features

### Automatic SEO Checks

The system automatically performs comprehensive SEO analysis during every crawl:

- **Title Optimization**: Page title presence, length, and quality checks
- **Meta Tags**: Description, canonical, viewport meta tag validation
- **Social Media**: Open Graph (og:title, og:description, og:image, etc.) and Twitter Card tags
- **Structured Data**: JSON-LD and Schema.org markup detection
- **Content Structure**: H1-H6 heading hierarchy and content length analysis
- **Mobile Optimization**: Viewport configuration and mobile-friendliness
- **Images**: Alt text presence, large image detection, optimization recommendations
- **Links**: Broken links, nofollow links, internal vs external link analysis
- **Language**: HTML language attribute validation

### SEO Issue Categories

- **title**: Page title optimization
- **meta**: Meta tags, canonical, viewport
- **headings**: Heading structure (H1-H6)
- **images**: Alt text and optimization
- **links**: Link quality and attributes
- **content**: Content length and quality
- **performance**: Large images and load time
- **mobile**: Mobile-friendliness checks
- **structured_data**: JSON-LD and schema markup

### Accessing SEO Results

1. **Run a Test**: Start a new run from your project page
2. **View Results**: Navigate to `/runs/[runId]` to see SEO issues
3. **Download Reports**: Click "Download" in the SEO Issues card for detailed JSON export
4. **Complete Export**: Download full session including SEO issues via "Download Session" button

## Configuration Options

### Database
- **Default**: SQLite (zero-config)
- **Options**: PostgreSQL, MySQL (configure in `.env`)

### Queue System
- **Default**: In-memory (single instance)
- **Options**: Redis (for distributed processing)

### Storage
- **Default**: Local filesystem
- **Options**: Cloudflare R2 (recommended for production), AWS S3
- **Configuration**: See "Cloud Storage Configuration" section above for detailed setup

### AI Provider
- **Default**: Claude (Anthropic)
- **Options**: Claude, OpenAI, Groq, or mock mode (no API key required)
- **Configuration**: See "AI Provider Configuration" section above for detailed setup instructions and API key requirements

### Browser Selection
- **Default**: Chromium
- **Options**: Firefox, WebKit (selectable per run)

### Headless Mode
- **Default**: Headless (no visible browser)
- **Option**: Set `PLAYWRIGHT_HEADLESS=false` in `.env` for visible browser

## API Endpoints

### Runs
- `GET /projects/:projectId/runs` - List all runs for a project
- `POST /projects/:projectId/runs` - Create a new run
- `GET /runs/:runId` - Get specific run details
- `DELETE /runs/:runId` - Delete a run

### Bugs
- `GET /runs/:runId/bugs` - Get bugs for a specific run
- `GET /bugs/:bugId` - Get specific bug details
- `PATCH /bugs/:bugId` - Update bug status

### SEO Issues
- `GET /runs/:runId/seo` - Get SEO issues for a specific run
- `GET /seo/:seoId` - Get specific SEO issue details
- `PATCH /seo/:seoId` - Update SEO issue status

## Project Management

### Creating a Project
1. Navigate to http://localhost:3000
2. Click "Create Project"
3. Enter project name and URL
4. Configure AI provider and crawling settings
5. Save the project

### Running Tests
1. Select a project from the dashboard
2. Click "Start New Run" for automatic site crawling
3. Or enter custom steps for scenario-based testing
4. Monitor real-time progress in the run details page

### Viewing Results
- **Bugs**: Identified issues with severity levels and categories
- **SEO Issues**: Comprehensive SEO analysis with recommendations
- **Screenshots**: Visual debugging with step-by-step screenshots
- **Generated Code**: Playwright test scripts for CI/CD integration

## Troubleshooting

### Playwright Not Found
If you get "Playwright browser not installed" error:
```bash
pnpm exec playwright install chromium
```

### Database Connection Issues
- Ensure SQLite is installed (most systems have it by default)
- Check database path in `.env` configuration
- Verify write permissions for database directory

### API Key Issues
- Verify your API keys are correctly set in `.env`
- Test with mock mode first: `AI_PROVIDER=mock`
- Check API key format and permissions
- Ensure the API key matches the selected AI provider

### AI Provider Issues
- Test API key validity with provider's dashboard
- Check account has sufficient credits/quota
- Try switching to a different provider to isolate the issue
- Use mock mode to test system without AI dependencies

### Testing AI Configuration
To verify your AI provider is working correctly:
```bash
# Test with mock mode first (no API key needed)
AI_PROVIDER=mock
pnpm dev

# If mock works, test with your chosen provider
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your_key
pnpm dev

# Run a simple test to verify AI is responding
# Check the run details page for AI-generated analysis
```

### Browser Launch Failures
- Ensure Playwright browsers are installed
- Try with headless mode disabled: `PLAYWRIGHT_HEADLESS=false`
- Check system dependencies for Chromium/Firefox

### Storage Issues
- For R2: Verify your credentials are correct and bucket exists
- For S3: Check IAM permissions and bucket policies
- Check network connectivity to cloud storage endpoints
- Review logs for specific storage error messages
- System will automatically fall back to local storage if cloud storage fails

### Testing Storage Configuration
To verify your storage configuration:
```bash
# Check logs for storage initialization
pnpm dev
# Look for "R2 storage client initialized" or "Local storage fallback"

# Test upload functionality
# Run a test with screenshots and check if artifacts are stored correctly
# R2 artifacts will be accessible via public URL if configured
# Local artifacts will be in the uploads/ directory
```

#Screen shots
<img width="1896" height="1439" alt="localhost_3000_" src="https://github.com/user-attachments/assets/1ceab4ac-8c07-4cd4-b127-3dad153fa566" />
<img width="1896" height="926" alt="localhost_3000_ (1)" src="https://github.com/user-attachments/assets/f575ec54-bfec-4104-9066-3e5a1e330c45" />
<img width="1896" height="2210" alt="localhost_3000_ (2)" src="https://github.com/user-attachments/assets/74c996e9-70a3-40d1-97dd-3ca6490a7cc3" />
<img width="1896" height="4193" alt="localhost_3000_ (3)" src="https://github.com/user-attachments/assets/613bb60e-df8e-4150-8dcb-020c3077b990" />
<img width="1896" height="4561" alt="localhost_3000_ (4)" src="https://github.com/user-attachments/assets/4a6b3cba-df05-4b82-85bf-41be5bb40e29" />
<img width="1896" height="3040" alt="localhost_3000_ (5)" src="https://github.com/user-attachments/assets/8b1d55eb-e7b6-418f-90a7-304919caa99a" />
<img width="1896" height="6436" alt="localhost_3000_ (6)" src="https://github.com/user-attachments/assets/59ae3744-31f1-41ba-a178-91d311c9f0d7" />

<img width="1896" height="1360" alt="localhost_3000_bugs_dd86bca5-2753-4092-bcea-070b2fdc66ff" src="https://github.com/user-attachments/assets/f30100e7-7066-43cd-9a71-2aa381636b16" />



## License

Private workspace
