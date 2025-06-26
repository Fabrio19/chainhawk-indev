# CryptoCompliance Backend Enterprise Setup Script for Windows
# Run this script in PowerShell as Administrator

Write-Host "🚀 Setting up CryptoCompliance Backend for Enterprise Development" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 20.x LTS" -ForegroundColor Red
    Write-Host "📥 Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is installed
try {
    $pgVersion = psql --version
    Write-Host "✅ PostgreSQL version: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL is not installed. Please install PostgreSQL 15+" -ForegroundColor Red
    Write-Host "📥 Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Check if Redis is installed (optional)
try {
    $redisVersion = redis-server --version
    Write-Host "✅ Redis version: $redisVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Redis is not installed. Job queues will not work." -ForegroundColor Yellow
    Write-Host "📥 Download from: https://redis.io/download" -ForegroundColor Yellow
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Blue
    @"
DATABASE_URL="postgresql://postgres:password@localhost:5432/cryptocompliance_db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
API_KEY_LENGTH=64
ENABLE_AUDIT_LOGGING=true
LOG_SENSITIVE_DATA=false
REDIS_URL="redis://localhost:6379"
BCRYPT_ROUNDS=12
SESSION_SECRET="your-session-secret-change-this"
OFAC_API_URL="https://api.treasury.gov/ofac"
UN_API_URL="https://scsanctions.un.org"
EU_API_URL="https://webgate.ec.europa.eu"
LOG_LEVEL="info"
LOG_FILE="logs/app.log"
ENABLE_METRICS=true
METRICS_PORT=9090
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ .env file created" -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    Write-Host "✅ Created logs directory" -ForegroundColor Green
}

# Check if database exists, create if not
Write-Host "🗄️  Setting up PostgreSQL database..." -ForegroundColor Blue
$DB_NAME = "cryptocompliance_db"
$DB_USER = "postgres"

# Try to connect to PostgreSQL
try {
    psql -U $DB_USER -h localhost -c "\l" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Connection failed"
    }
} catch {
    Write-Host "❌ Cannot connect to PostgreSQL. Please ensure:" -ForegroundColor Red
    Write-Host "   1. PostgreSQL service is running" -ForegroundColor Yellow
    Write-Host "   2. User 'postgres' exists and has proper permissions" -ForegroundColor Yellow
    Write-Host "   3. Password authentication is configured" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔧 Quick setup commands:" -ForegroundColor Yellow
    Write-Host "   Start PostgreSQL service from Services.msc" -ForegroundColor Yellow
    Write-Host "   Or run: net start postgresql-x64-15" -ForegroundColor Yellow
    Write-Host "   Then: psql -U postgres -c `"ALTER USER postgres PASSWORD 'password';`"" -ForegroundColor Yellow
    exit 1
}

# Check if database exists
$dbExists = psql -U $DB_USER -h localhost -lqt 2>$null | Select-String $DB_NAME
if ($dbExists) {
    Write-Host "✅ Database '$DB_NAME' already exists" -ForegroundColor Green
} else {
    Write-Host "📊 Creating database '$DB_NAME'..." -ForegroundColor Blue
    $createResult = createdb -U $DB_USER -h localhost $DB_NAME 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database created successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create database: $createResult" -ForegroundColor Red
        Write-Host "Please check PostgreSQL permissions" -ForegroundColor Yellow
        exit 1
    }
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Blue
npm run db:generate

# Run database migrations
Write-Host "📋 Running database migrations..." -ForegroundColor Blue
npm run db:migrate

# Seed database with sample data
Write-Host "🌱 Seeding database with sample users..." -ForegroundColor Blue
npm run db:seed

# Create additional enterprise directories
Write-Host "📁 Creating enterprise directories..." -ForegroundColor Blue
$directories = @("logs/audit", "logs/errors", "logs/access", "config", "scripts")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Create basic configuration files
Write-Host "⚙️  Creating configuration files..." -ForegroundColor Blue

# Create production environment template
@"
# Production Environment Variables
# Copy this file to .env.production and update values

DATABASE_URL="postgresql://username:password@host:5432/database"
JWT_SECRET="change-this-to-a-secure-random-string"
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://your-domain.com"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
API_KEY_LENGTH=64
ENABLE_AUDIT_LOGGING=true
LOG_SENSITIVE_DATA=false
REDIS_URL="redis://redis-host:6379"
BCRYPT_ROUNDS=12
SESSION_SECRET="change-this-to-a-secure-random-string"
OFAC_API_URL="https://api.treasury.gov/ofac"
UN_API_URL="https://scsanctions.un.org"
EU_API_URL="https://webgate.ec.europa.eu"
LOG_LEVEL="warn"
LOG_FILE="logs/app.log"
ENABLE_METRICS=true
METRICS_PORT=9090
"@ | Out-File -FilePath ".env.production.template" -Encoding UTF8

# Create Docker configuration
@"
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: cryptocompliance_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/cryptocompliance_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs

volumes:
  postgres_data:
  redis_data:
"@ | Out-File -FilePath "docker-compose.yml" -Encoding UTF8

# Create Dockerfile
@"
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["npm", "start"]
"@ | Out-File -FilePath "Dockerfile" -Encoding UTF8

Write-Host ""
Write-Host "🎉 Enterprise setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Default Users Created:" -ForegroundColor Yellow
Write-Host "Admin:   admin@cryptocompliance.com / Admin123!" -ForegroundColor White
Write-Host "Analyst: analyst@cryptocompliance.com / Analyst123!" -ForegroundColor White
Write-Host "Partner: partner@exchange.com / Partner123!" -ForegroundColor White
Write-Host ""
Write-Host "🚀 To start the development server:" -ForegroundColor Yellow
Write-Host "npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🔧 To open Prisma Studio (database GUI):" -ForegroundColor Yellow
Write-Host "npm run db:studio" -ForegroundColor White
Write-Host ""
Write-Host "🐳 To run with Docker:" -ForegroundColor Yellow
Write-Host "docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "📚 Read backend/README.md for full documentation" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: Change default passwords and secrets in production!" -ForegroundColor Red 