#!/bin/bash

# Stop and remove existing MinIO container (ignore errors if not running)
docker stop minio 2>/dev/null || true
docker rm minio 2>/dev/null || true

# Start MinIO with WORM mode enabled
docker run -d --name minio -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=admin" -e "MINIO_ROOT_PASSWORD=password123" \
  minio/minio server /data --console-address ":9001" --worm

echo "✅ MinIO started with WORM mode enabled."

# Wait a few seconds for MinIO to initialize
sleep 5

# (Optional) Start backend and frontend with Docker Compose
if [ -f docker-compose.yml ]; then
  echo "🟢 Starting backend and frontend with Docker Compose..."
  docker-compose up -d
else
  echo "⚠️  docker-compose.yml not found in project root. Please start backend/frontend manually if needed."
fi

echo "🎉 All done! MinIO is now running in WORM mode."
echo "MinIO Console: http://localhost:9001 (admin/password123)" 