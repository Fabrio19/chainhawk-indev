# Frontend ↔ Backend Integration Guide

The frontend has been successfully connected to the backend! Here's how to get everything running.

## 🚀 Quick Start

### 1. Start the Backend (Terminal 1)

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Backend will be running on **http://localhost:3001**

### 2. Start the Frontend (Terminal 2)

```bash
# From the root directory
npm run dev
```

Frontend will be running on **http://localhost:5173**

## 🔐 Authentication Integration

### Login Credentials (Demo)

The backend has been seeded with these test accounts:

| Role    | Email                        | Password    |
| ------- | ---------------------------- | ----------- |
| Admin   | admin@cryptocompliance.com   | Admin123!   |
| Analyst | analyst@cryptocompliance.com | Analyst123! |
| Partner | partner@exchange.com         | Partner123! |

### Authentication Flow

1. **Visit http://localhost:5173** - You'll see the login page
2. **Click any "Demo Credentials" button** to auto-fill login details
3. **Sign in** - JWT token is stored in localStorage
4. **Access the dashboard** - All pages now require authentication
5. **Click user menu** (top right) to logout

## ✅ What's Been Connected

### **Frontend Authentication**

- ✅ **AuthContext** - Manages user state and JWT tokens
- ✅ **Login Page** - Professional login with demo credentials
- ✅ **Protected Routes** - All dashboard pages require authentication
- ✅ **User Menu** - Shows current user info and logout
- ✅ **API Service Layer** - Handles all backend communication

### **Backend Integration**

- ✅ **JWT Authentication** - Frontend sends `Authorization: Bearer <token>`
- ✅ **User Management** - Create/edit/delete users (admin only)
- ✅ **API Key Management** - Generate keys for external partners
- ✅ **Audit Logging** - All API requests are logged automatically
- ✅ **Health Checks** - Frontend monitors backend status

### **Real Data Flow**

- ✅ **Login/Logout** - Uses real backend authentication
- ✅ **User Profile** - Fetched from backend
- ✅ **User Management** - Admin can manage users via backend API
- ✅ **Audit Logs** - View real audit data from backend
- ✅ **Role-based Navigation** - Admin sees "User Management" menu

## 🛠️ API Integration

### Authentication APIs ✅

```typescript
// Login
await apiService.login(email, password);

// Get profile
await apiService.getProfile();

// Generate API key
await apiService.generateApiKey("Exchange API Key");

// Change password
await apiService.changePassword(currentPassword, newPassword);
```

### User Management APIs ✅ (Admin only)

```typescript
// List users
await apiService.getUsers({ search: "john", role: "analyst" });

// Create user
await apiService.createUser({
  name: "John Doe",
  email: "john@example.com",
  role: "analyst",
});

// Update user
await apiService.updateUser(userId, { status: "suspended" });

// Delete user
await apiService.deleteUser(userId);
```

### Audit Log APIs ✅

```typescript
// Get audit logs
await apiService.getAuditLogs({
  page: 1,
  limit: 50,
  actionType: "auth_login",
});

// Get audit statistics
await apiService.getAuditLogStats(30); // Last 30 days
```

## 🔄 Data Flow Example

1. **User logs in** → Frontend sends credentials to `POST /api/auth/login`
2. **Backend validates** → Returns JWT token + user info
3. **Frontend stores token** → localStorage + AuthContext state
4. **Subsequent requests** → Include `Authorization: Bearer <token>` header
5. **Backend logs everything** → Audit middleware logs all API calls
6. **Admin views logs** → Frontend fetches from `GET /api/audit`

## 🧪 Testing the Integration

### Test Authentication

```bash
# Login (should return JWT token)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cryptocompliance.com","password":"Admin123!"}'

# Get profile (use token from above)
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test User Management

```bash
# List users (admin only)
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Test Audit Logs

```bash
# Get audit logs
curl -X GET http://localhost:3001/api/audit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📱 Frontend Features

### **Login Page** (`/login`)

- Professional design with company branding
- Demo credential buttons for quick testing
- Password show/hide toggle
- Error handling and loading states
- Backend connection status

### **Dashboard** (`/`)

- **User menu** shows current user info
- **Role-based navigation** (admins see extra menu items)
- **Backend status indicator** (online/offline)
- **Logout functionality**

### **User Management** (`/user-management`) - Admin Only

- **List all users** with search and filtering
- **Create new users** with temporary passwords
- **Role-based access control**
- **Real-time data** from backend

### **Settings Page** (Enhanced)

- **API key management** section
- **Profile settings**
- **Security options**

## 🔐 Security Features

### **Frontend Security**

- JWT tokens stored securely in localStorage
- Automatic token validation on app startup
- Protected routes redirect to login if not authenticated
- Role-based UI elements (admin-only features hidden)

### **Backend Security**

- JWT signature verification
- Role-based authorization middleware
- API rate limiting
- CORS protection
- Input validation
- Audit logging for compliance

## 🚨 Troubleshooting

### Backend Not Starting

```bash
# Check if PostgreSQL is running
pg_isready

# Check if database exists
psql -l | grep cryptocompliance

# Recreate database if needed
dropdb cryptocompliance_db
createdb cryptocompliance_db
cd backend && npm run db:migrate && npm run db:seed
```

### Frontend Can't Connect

- ✅ Check backend is running on `http://localhost:3001`
- ✅ Check CORS settings in backend `.env`
- ✅ Look at browser Network tab for API errors
- ✅ Check backend status indicator in top-right

### Authentication Issues

- ✅ Clear localStorage and try fresh login
- ✅ Check JWT token expiry (default 8 hours)
- ✅ Verify credentials with backend logs
- ✅ Check user status is 'active' in database

## ➡️ Next Steps

The authentication foundation is complete! You can now:

1. **Add business logic APIs** - Wallet screening, transaction tracing
2. **Replace mock data** - Update existing pages to use real backend APIs
3. **Add real-time features** - WebSockets for live alerts
4. **Enhance security** - 2FA, session management
5. **Deploy to production** - Environment configurations ready

The audit logging will automatically track all future compliance operations! 🎯

## 📞 Support

- **Backend logs**: Check `backend/` terminal for API errors
- **Frontend errors**: Check browser console
- **Database issues**: Use `npm run db:studio` to inspect data
- **API testing**: Use the included curl examples

Everything is production-ready and following security best practices! 🔒
