#!/bin/bash

echo "🚀 Setting up CryptoCompliance Backend for Enterprise Development"
echo "================================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20.x LTS"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 15+"
    echo "📥 Download from: https://www.postgresql.org/download/"
    exit 1
fi

# Check if Redis is installed (for job queues)
if ! command -v redis-server &> /dev/null; then
    echo "⚠️  Redis is not installed. Job queues will not work."
    echo "📥 Download from: https://redis.io/download"
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo "✅ PostgreSQL version: $(psql --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
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
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Create logs directory
mkdir -p logs

# Check if database exists, create if not
echo "🗄️  Setting up PostgreSQL database..."
DB_NAME="cryptocompliance_db"
DB_USER="postgres"

# Try to connect to PostgreSQL
if ! psql -U $DB_USER -h localhost -c '\l' > /dev/null 2>&1; then
    echo "❌ Cannot connect to PostgreSQL. Please ensure:"
    echo "   1. PostgreSQL service is running"
    echo "   2. User 'postgres' exists and has proper permissions"
    echo "   3. Password authentication is configured"
    echo ""
    echo "🔧 Quick setup commands:"
    echo "   sudo systemctl start postgresql"
    echo "   sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'password';\""
    exit 1
fi

# Check if database exists
if psql -U $DB_USER -h localhost -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "✅ Database '$DB_NAME' already exists"
else
    echo "📊 Creating database '$DB_NAME'..."
    createdb -U $DB_USER -h localhost $DB_NAME
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
    else
        echo "❌ Failed to create database. Please check PostgreSQL permissions"
        exit 1
    fi
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Run database migrations
echo "📋 Running database migrations..."
npm run db:migrate

# Seed database with sample data
echo "🌱 Seeding database with sample users..."
npm run db:seed

# Create additional enterprise directories
echo "📁 Creating enterprise directories..."
mkdir -p logs/audit
mkdir -p logs/errors
mkdir -p logs/access
mkdir -p config
mkdir -p scripts

# Create basic configuration files
echo "⚙️  Creating configuration files..."

# Create production environment template
cat > .env.production.template << EOF
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
EOF

# Create Docker configuration
cat > docker-compose.yml << EOF
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
EOF

# Create Dockerfile
cat > Dockerfile << EOF
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
EOF

echo ""
echo "🎉 Enterprise setup completed successfully!"
echo ""
echo "📝 Default Users Created:"
echo "Admin:   admin@cryptocompliance.com / Admin123!"
echo "Analyst: analyst@cryptocompliance.com / Analyst123!"
echo "Partner: partner@exchange.com / Partner123!"
echo ""
echo "🚀 To start the development server:"
echo "npm run dev"
echo ""
echo "🔧 To open Prisma Studio (database GUI):"
echo "npm run db:studio"
echo ""
echo "🐳 To run with Docker:"
echo "docker-compose up -d"
echo ""
echo "📚 Read backend/README.md for full documentation"
echo ""
echo "⚠️  IMPORTANT: Change default passwords and secrets in production!"
