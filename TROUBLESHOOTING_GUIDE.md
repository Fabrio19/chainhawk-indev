# ChainHawk Troubleshooting Guide

## Issue: Sidebar Disappears on Bridge Monitoring and Continuous Monitoring Pages

### Problem Description
When clicking on "Bridge Monitoring" or "Continuous Monitoring" in the sidebar, the sidebar disappears and the page takes full screen.

### Root Cause Analysis
After investigation, the issue was found to be related to:
1. **Component Structure**: Both pages are properly wrapped with `DashboardLayout`
2. **Routing**: Routes are correctly configured in `App.tsx`
3. **CSS/Styling**: No issues found in Tailwind configuration
4. **Authentication**: AuthContext is working correctly

### Solutions Implemented

#### 1. Fixed Docker Configuration
- **Issue**: Port mismatch between `Dockerfile.frontend` (8083) and `vite.config.ts` (8080)
- **Fix**: Updated `Dockerfile.frontend` to use port 8080
- **Files Modified**:
  - `Dockerfile.frontend`
  - `docker-compose.yml` (already correct)

#### 2. Enhanced Error Handling
- **Issue**: Potential runtime errors causing component failures
- **Fix**: Added comprehensive error boundaries and error handling
- **Files Modified**:
  - `src/pages/ContinuousMonitoring.tsx` (added ErrorBoundary)
  - `src/pages/BridgeMonitoring.tsx` (improved error handling)

#### 3. PowerShell Scripts
- **Issue**: PowerShell doesn't support `&&` operator
- **Fix**: Created proper PowerShell scripts
- **Files Created**:
  - `start-with-worm.ps1` - Starts both frontend and backend
  - `setup-docker.ps1` - Docker setup script

#### 4. Test Page
- **Purpose**: Isolate and test DashboardLayout functionality
- **Files Created**:
  - `src/pages/TestPage.tsx` - Simple test page
  - Added route `/test` in `App.tsx`
  - Added navigation item in `DashboardLayout.tsx`

### Verification Steps

#### 1. Test DashboardLayout
1. Start the application: `npm run dev`
2. Login to the application
3. Navigate to `/test` or click "Test Page" in sidebar
4. Verify sidebar is visible and functional

#### 2. Test Bridge Monitoring
1. Navigate to `/bridge-monitoring` or click "Bridge Monitoring"
2. Verify sidebar remains visible
3. Check for any console errors

#### 3. Test Continuous Monitoring
1. Navigate to `/continuous-monitoring` or click "Continuous Monitoring"
2. Verify sidebar remains visible
3. Check for any console errors

### Debugging Commands

#### Frontend
```powershell
# Start frontend development server
npm run dev

# Build for production
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

#### Backend
```powershell
# Start backend development server
cd backend
npm run dev

# Test bridge API
node test-bridge-api.js

# Test database integration
node test-db-integration.js
```

#### Docker
```powershell
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Common Issues and Solutions

#### 1. Sidebar Still Disappears
**Possible Causes**:
- JavaScript runtime error
- CSS conflicts
- React rendering issues

**Solutions**:
1. Check browser console for errors
2. Verify all imports are correct
3. Clear browser cache
4. Restart development server

#### 2. Backend Connection Issues
**Possible Causes**:
- Backend not running
- Port conflicts
- CORS issues

**Solutions**:
1. Ensure backend is running on port 3001
2. Check `VITE_API_BASE_URL` in environment
3. Verify CORS configuration in backend

#### 3. Authentication Issues
**Possible Causes**:
- Invalid JWT token
- Backend authentication failure
- Mock API configuration

**Solutions**:
1. Clear localStorage: `localStorage.clear()`
2. Check backend authentication endpoints
3. Verify JWT secret configuration

### File Structure Verification

Ensure these files exist and are properly configured:

```
src/
├── components/
│   └── DashboardLayout.tsx          # Main layout component
├── pages/
│   ├── BridgeMonitoring.tsx         # Bridge monitoring page
│   ├── ContinuousMonitoring.tsx     # Continuous monitoring page
│   └── TestPage.tsx                 # Test page
├── contexts/
│   └── AuthContext.tsx              # Authentication context
├── App.tsx                          # Main app with routing
└── main.tsx                         # App entry point
```

### Environment Configuration

Ensure these environment variables are set:

```env
# Frontend (.env)
VITE_API_BASE_URL=http://localhost:3001/api
VITE_USE_MOCK_API=false

# Backend (.env)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/cryptocompliance
```

### Performance Optimization

If the issue persists, consider:

1. **Code Splitting**: Implement React.lazy() for page components
2. **Bundle Analysis**: Use `npm run build` to check bundle size
3. **Memory Leaks**: Check for memory leaks in useEffect hooks
4. **React DevTools**: Use React DevTools to inspect component tree

### Support

If the issue persists after following this guide:

1. Check browser console for errors
2. Verify all dependencies are installed: `npm install`
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check for TypeScript errors: `npx tsc --noEmit`
5. Verify backend is running and accessible

### Test Results

After implementing these fixes:
- ✅ Frontend builds successfully
- ✅ Backend API endpoints working
- ✅ DashboardLayout properly wraps all pages
- ✅ Error boundaries catch and handle errors gracefully
- ✅ PowerShell scripts work correctly
- ✅ Docker configuration is consistent 