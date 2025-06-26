# CryptoCompliance Backend

Production-ready Node.js + Express backend for the blockchain compliance platform with PostgreSQL, JWT authentication, API key management, and comprehensive audit logging.

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 20.x LTS
- PostgreSQL 15+
- npm or yarn

### 2. Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

### 3. Database Setup

```bash
# Create database (example for PostgreSQL)
createdb cryptocompliance_db

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
# Start with auto-reload
npm run dev

# Or start production mode
npm start
```

## 📋 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cryptocompliance_db"

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
```

## 🔐 Authentication

The backend supports two authentication methods:

### 1. JWT Tokens (Web Application)

```bash
# Login to get JWT token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cryptocompliance.com","password":"Admin123!"}'

# Use token in subsequent requests
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. API Keys (External Partners)

```bash
# Generate API key (requires JWT authentication)
curl -X POST http://localhost:3001/api/auth/api-key \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My API Key"}'

# Use API key for requests
curl -X GET http://localhost:3001/api/compliance/status \
  -H "X-API-Key: YOUR_API_KEY"
```

## 👥 User Roles

- **admin**: Full system access, user management, audit logs
- **analyst**: Compliance operations, case management, reporting
- **partner**: Limited API access for external integrations

## 📊 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/api-key` - Generate/rotate API key
- `DELETE /api/auth/api-key` - Revoke API key
- `POST /api/auth/change-password` - Change password

### User Management (Admin only)

- `GET /api/users` - List all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/me/api-keys` - Get current user's API keys

### Audit Logs (Admin/Analyst)

- `GET /api/audit` - Get audit logs with filtering
- `GET /api/audit/:id` - Get specific audit log entry
- `GET /api/audit/stats` - Get audit statistics
- `GET /api/audit/users/:userId` - Get logs for specific user

### System

- `GET /health` - Health check endpoint

## 🔍 Audit Logging

All API requests are automatically logged with:

- User ID or API key ID
- Action type (auto-determined from endpoint)
- HTTP method and endpoint
- Request payload (sanitized)
- Response status code
- IP address and user agent
- Request duration
- Timestamp

### Sensitive Data Protection

The audit system automatically redacts sensitive fields:

- Passwords
- API keys
- JWT tokens
- Private keys

Configure with `LOG_SENSITIVE_DATA=false` in production.

## 🛡️ Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Security**: Signed tokens with expiration
- **API Key Hashing**: SHA-256 hashed keys in database
- **Rate Limiting**: Configurable request limits
- **CORS Protection**: Configurable origin restrictions
- **Helmet.js**: Security headers
- **Input Validation**: express-validator for all inputs
- **SQL Injection Protection**: Prisma ORM prevents SQL injection

## 📈 Database Schema

### Users Table

```sql
users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    api_key_hash TEXT,
    role ENUM('admin', 'analyst', 'partner'),
    status ENUM('active', 'suspended'),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
)
```

### Audit Log Table

```sql
audit_log (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    api_key_id UUID,
    action_type TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    http_method TEXT NOT NULL,
    request_payload JSONB,
    response_status INTEGER NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
)
```

### API Keys Table

```sql
api_keys (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    permissions JSONB,
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
)
```

## 🧪 Default Users (Development)

After running `npm run db:seed`:

| Role    | Email                        | Password    | Purpose               |
| ------- | ---------------------------- | ----------- | --------------------- |
| admin   | admin@cryptocompliance.com   | Admin123!   | System administration |
| analyst | analyst@cryptocompliance.com | Analyst123! | Compliance operations |
| partner | partner@exchange.com         | Partner123! | External API access   |

**⚠️ Change these credentials in production!**

## 🚀 Production Deployment

1. **Environment Setup**

   ```bash
   NODE_ENV=production
   JWT_SECRET="strong-random-secret-key"
   DATABASE_URL="your-production-database-url"
   ```

2. **Database Migration**

   ```bash
   npm run db:migrate
   ```

3. **Start Application**

   ```bash
   npm start
   ```

4. **Monitor Logs**
   - All audit logs are stored in PostgreSQL
   - Use `/api/audit/stats` for monitoring
   - Set up log aggregation (ELK, Datadog, etc.)

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Run database migrations
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (development only)
npm run db:push
```

## 📝 Legal Compliance

This backend implements audit logging required by:

- **FIU-IND** (Financial Intelligence Unit - India)
- **SEBI** (Securities Exchange Board of India)
- **RBI** (Reserve Bank of India)
- **FATF** Travel Rule requirements

All API calls are logged with tamper-proof timestamps and user attribution for regulatory reporting.

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Test database connection
npx prisma db pull
```

### Migration Issues

```bash
# Reset database (development only)
npx prisma migrate reset
npx prisma db push
```

### JWT Issues

- Ensure `JWT_SECRET` is set and consistent
- Check token expiration time (`JWT_EXPIRE`)
- Verify frontend is sending correct Authorization header

### API Key Issues

- API keys are one-way hashed - regenerate if lost
- Check `X-API-Key` header format
- Verify user status is "active"

## 📚 Next Steps

This backend foundation is ready for compliance business logic:

1. **Wallet Screening APIs** - Add endpoints for blockchain analysis
2. **Transaction Tracing** - Implement fund flow tracking
3. **Sanction Screening** - Integrate with OFAC/UN/EU lists
4. **Report Generation** - STR/CTR/SAR automated reporting
5. **Real-time Monitoring** - WebSocket connections for alerts

The audit logging and authentication system will automatically track all future compliance operations.
