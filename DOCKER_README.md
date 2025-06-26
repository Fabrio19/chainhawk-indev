# 🐳 CryptoCompliance Docker Setup

This guide will help you run CryptoCompliance using Docker with all necessary services.

## 📋 Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- At least 4GB of available RAM
- 10GB of available disk space

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

Run the PowerShell setup script:

```powershell
.\setup-docker.ps1
```

### Option 2: Manual Setup

1. **Create environment file for backend:**
   ```powershell
   # The setup script will create this automatically
   # Or create backend\.env manually with the required variables
   ```

2. **Build and start services:**
   ```powershell
   docker-compose build
   docker-compose up -d
   ```

3. **Wait for services to be ready:**
   ```powershell
   docker-compose ps
   ```

## 🌐 Access Points

Once running, you can access:

- **Frontend**: http://localhost:8083
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📊 Service Status

Check the status of all services:

```powershell
docker-compose ps
```

## 📝 Useful Commands

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Manage Services
```powershell
# Stop all services
docker-compose down

# Restart specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build
```

### Database Operations
```powershell
# Run Prisma migrations
docker-compose exec backend npx prisma migrate dev

# Seed the database
docker-compose exec backend npm run seed

# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d cryptocompliance
```

### Clean Up
```powershell
# Remove all containers and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all
```

## 🔧 Configuration

### Environment Variables

The main configuration is handled through environment variables in the `docker-compose.yml` file:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `FRONTEND_URL`: CORS configuration for frontend

### Customizing Ports

To change ports, modify the `ports` section in `docker-compose.yml`:

```yaml
ports:
  - "8083:8083"  # Change 8083 to your preferred port
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use:**
   ```powershell
   # Check what's using the port
   netstat -ano | findstr :8083
   
   # Kill the process or change the port in docker-compose.yml
   ```

2. **Database connection issues:**
   ```powershell
   # Check if PostgreSQL is running
   docker-compose logs postgres
   
   # Restart the database
   docker-compose restart postgres
   ```

3. **Redis connection issues:**
   ```powershell
   # Check if Redis is running
   docker-compose logs redis
   
   # Restart Redis
   docker-compose restart redis
   ```

4. **Backend not starting:**
   ```powershell
   # Check backend logs
   docker-compose logs backend
   
   # Rebuild backend
   docker-compose up -d --build backend
   ```

### Reset Everything

If you need to start fresh:

```powershell
# Stop and remove everything
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start over
.\setup-docker.ps1
```

## 📈 Performance

For better performance in development:

1. **Increase Docker resources:**
   - Memory: 4GB+
   - CPUs: 2+

2. **Use volume mounts for hot reloading:**
   - Backend code changes will auto-reload
   - Frontend code changes will auto-reload

## 🔒 Security Notes

- Default passwords are used for development
- JWT secret should be changed in production
- Database credentials should be secured in production
- Redis should be configured with authentication in production

## 🚀 Production Deployment

For production deployment:

1. Use production Dockerfiles
2. Set up proper environment variables
3. Configure SSL/TLS
4. Set up proper database backups
5. Configure monitoring and logging
6. Use Docker secrets for sensitive data 