# PostgreSQL Migration & Enterprise Setup Guide

## Overview

This guide covers the migration from SQLite to PostgreSQL and the enterprise-level setup for the CryptoCompliance platform.

## 🗄️ Database Migration

### What Changed

- **From**: SQLite (`dev.db` file)
- **To**: PostgreSQL (production-grade database)
- **Benefits**: 
  - Better concurrency and performance
  - ACID compliance
  - Advanced indexing and query optimization
  - Better scalability
  - Enterprise features (replication, clustering, etc.)

### Prisma Schema

The Prisma schema is already configured for PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Key PostgreSQL-specific features used:
- `@db.Uuid` for UUID fields
- `Json` type (maps to JSONB in PostgreSQL)
- Proper indexing for performance
- Foreign key constraints with cascade options

## 🚀 Quick Setup

### Prerequisites

1. **Node.js 20.x LTS**
2. **PostgreSQL 15+**
3. **Redis** (optional, for job queues)

### Windows Setup

```powershell
# Run as Administrator
.\setup-dev.ps1
```

### Linux/macOS Setup

```bash
# Make script executable
chmod +x setup-dev.sh

# Run setup
./setup-dev.sh
```

### Manual Setup

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib

   # macOS
   brew install postgresql

   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Start PostgreSQL Service**
   ```bash
   # Linux
   sudo systemctl start postgresql
   sudo systemctl enable postgresql

   # macOS
   brew services start postgresql

   # Windows
   # Start from Services.msc or use:
   net start postgresql-x64-15
   ```

3. **Create Database**
   ```bash
   # Connect to PostgreSQL
   sudo -u postgres psql

   # Set password for postgres user
   ALTER USER postgres PASSWORD 'password';

   # Create database
   CREATE DATABASE cryptocompliance_db;

   # Exit
   \q
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Setup Environment**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env with your database credentials
   DATABASE_URL="postgresql://postgres:password@localhost:5432/cryptocompliance_db"
   ```

6. **Run Migrations**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/database"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRE="8h"

# API Configuration
PORT=3001
NODE_ENV="development"

# CORS Configuration
FRONTEND_URL="http://localhost:5173"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# API Key Configuration
API_KEY_LENGTH=64

# Audit Logging
ENABLE_AUDIT_LOGGING=true
LOG_SENSITIVE_DATA=false

# Redis Configuration (for job queues)
REDIS_URL="redis://localhost:6379"

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET="your-session-secret-change-this"

# External APIs (for sanctions data)
OFAC_API_URL="https://api.treasury.gov/ofac"
UN_API_URL="https://scsanctions.un.org"
EU_API_URL="https://webgate.ec.europa.eu"

# Logging
LOG_LEVEL="info"
LOG_FILE="logs/app.log"

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### Production Configuration

1. **Copy production template**
   ```bash
   cp .env.production.template .env.production
   ```

2. **Update with production values**
   - Use strong, unique secrets
   - Configure production database URL
   - Set appropriate log levels
   - Configure external service URLs

## 🐳 Docker Setup

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services Included

- **PostgreSQL 15**: Main database
- **Redis 7**: Job queue and caching
- **Backend**: Node.js application

### Health Checks

All services include health checks:
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- Backend: HTTP health endpoint

## 📊 Database Management

### Prisma Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create and run migrations
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database
npm run db:seed
```

### Backup and Restore

```bash
# Backup database
pg_dump -U postgres -h localhost cryptocompliance_db > backup.sql

# Restore database
psql -U postgres -h localhost cryptocompliance_db < backup.sql
```

### Performance Optimization

1. **Indexes**: Already configured in schema
2. **Connection Pooling**: Configure in production
3. **Query Optimization**: Use Prisma's query optimization features

## 🔒 Security Considerations

### Database Security

1. **Change default passwords**
2. **Use SSL connections in production**
3. **Implement connection pooling**
4. **Regular security updates**

### Application Security

1. **Environment variables**: Never commit secrets
2. **JWT secrets**: Use strong, unique secrets
3. **API keys**: Rotate regularly
4. **Rate limiting**: Configure appropriately

## 📈 Monitoring and Logging

### Log Structure

```
logs/
├── app.log          # Application logs
├── audit/           # Audit logs
├── errors/          # Error logs
└── access/          # Access logs
```

### Metrics

- Application metrics on port 9090
- Database performance monitoring
- API response times
- Error rates

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   
   # Check if port 5432 is open
   netstat -tlnp | grep 5432
   ```

2. **Authentication Failed**
   ```bash
   # Reset postgres password
   sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
   ```

3. **Database Not Found**
   ```bash
   # Create database
   createdb -U postgres -h localhost cryptocompliance_db
   ```

4. **Migration Errors**
   ```bash
   # Reset database
   npx prisma migrate reset
   
   # Run migrations again
   npm run db:migrate
   ```

### Performance Issues

1. **Slow Queries**: Check indexes
2. **Connection Limits**: Configure connection pooling
3. **Memory Usage**: Monitor and optimize

## 🔄 Migration from SQLite

If you have existing SQLite data:

1. **Export data from SQLite**
   ```bash
   sqlite3 dev.db ".dump" > sqlite_dump.sql
   ```

2. **Convert to PostgreSQL format**
   - Update data types
   - Fix constraints
   - Update sequences

3. **Import to PostgreSQL**
   ```bash
   psql -U postgres -h localhost cryptocompliance_db < converted_dump.sql
   ```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)
- [Enterprise Security Guidelines](https://owasp.org/www-project-top-ten/)

## 🆘 Support

For issues related to:
- **Database**: Check PostgreSQL logs
- **Application**: Check application logs
- **Configuration**: Verify environment variables
- **Performance**: Monitor database metrics

---

**Note**: This migration significantly improves the enterprise readiness of the application by using a production-grade database with better performance, scalability, and reliability. 