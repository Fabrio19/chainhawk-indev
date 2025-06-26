# Stop and remove existing MinIO container (ignore errors if not running)
Write-Host "🛑 Stopping and removing existing MinIO container..." -ForegroundColor Yellow
docker stop minio 2>$null
docker rm minio 2>$null

# Start MinIO with WORM mode enabled
Write-Host "🚀 Starting MinIO with WORM mode enabled..." -ForegroundColor Green
docker run -d --name minio -p 9000:9000 -p 9001:9001 `
  -e "MINIO_ROOT_USER=admin" -e "MINIO_ROOT_PASSWORD=password123" `
  minio/minio server /data --console-address ":9001" --worm

Write-Host "✅ MinIO started with WORM mode enabled." -ForegroundColor Green

# Wait a few seconds for MinIO to initialize
Write-Host "⏳ Waiting for MinIO to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# (Optional) Start backend and frontend with Docker Compose
if (Test-Path "docker-compose.yml") {
    Write-Host "🟢 Starting backend and frontend with Docker Compose..." -ForegroundColor Green
    docker-compose up -d
} else {
    Write-Host "⚠️  docker-compose.yml not found in project root. Please start backend/frontend manually if needed." -ForegroundColor Yellow
}

Write-Host "🎉 All done! MinIO is now running in WORM mode." -ForegroundColor Green
Write-Host "MinIO Console: http://localhost:9001 (admin/password123)" -ForegroundColor Cyan 