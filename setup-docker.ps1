# Docker Setup Script for CryptoCompliance
Write-Host "🐳 Setting up CryptoCompliance with Docker..." -ForegroundColor Green

# Check if Docker is installed
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    docker version | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is available" -ForegroundColor Green

# Create .env file for backend
$backendEnvContent = @"
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres123@postgres:5432/cryptocompliance"

# Redis Configuration
REDIS_URL="redis://redis:6379"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRE="8h"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL="http://localhost:8083"

# Audit Logging
ENABLE_AUDIT_LOGGING=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# API Keys (for external services)
CHAINALYSIS_API_KEY="demo_key_chainalysis"
ELLIPTIC_API_KEY="demo_key_elliptic"
TRM_API_KEY="demo_key_trm"
"@

# Write backend .env file
$backendEnvContent | Out-File -FilePath "backend\.env" -Encoding UTF8
Write-Host "✅ Created backend .env file" -ForegroundColor Green

# Build and start services
Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
docker-compose build

Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep 10

# Check service status
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n🎉 Setup complete!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:8083" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🗄️ PostgreSQL: localhost:5432" -ForegroundColor Cyan
Write-Host "🔴 Redis: localhost:6379" -ForegroundColor Cyan

Write-Host "`n📝 Useful commands:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f backend    # View backend logs" -ForegroundColor White
Write-Host "  docker-compose logs -f frontend   # View frontend logs" -ForegroundColor White
Write-Host "  docker-compose down              # Stop all services" -ForegroundColor White
Write-Host "  docker-compose restart backend   # Restart backend only" -ForegroundColor White 