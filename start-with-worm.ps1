# ChainHawk Start Script for Windows PowerShell
# This script starts the frontend and backend services

Write-Host "🚀 Starting ChainHawk Application..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Check if backend directory exists
if (-not (Test-Path "backend")) {
    Write-Host "❌ Backend directory not found" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Starting services..." -ForegroundColor Yellow
Write-Host ""

# Start backend in a new PowerShell window
Write-Host "🔧 Starting Backend API..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in current window
Write-Host "🎨 Starting Frontend..." -ForegroundColor Cyan
Write-Host ""

# Check if frontend dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# Start the frontend development server
Write-Host "🌐 Starting Vite development server..." -ForegroundColor Green
Write-Host "   Frontend will be available at: http://localhost:8080" -ForegroundColor Cyan
Write-Host "   Backend API will be available at: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""

npm run dev 