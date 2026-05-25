# Migration Guide: PHP API → Node.js Backend

## Overview

This document guides the migration from the current PHP backend to Node.js while maintaining frontend compatibility.

## Timeline

**Phase 1 (Current):** Setup Node.js backend infrastructure
- ✅ Create Express server
- ✅ Database connection setup
- ✅ Authentication middleware
- ✅ Teachers endpoint (key endpoint)
- ✅ Other endpoints (placeholder)

**Phase 2 (Next):** Fully migrate all endpoints
- [ ] Complete evaluations endpoint
- [ ] Complete questions endpoint
- [ ] Complete users endpoint
- [ ] Complete analytics endpoint
- [ ] Implement file uploads (teacher pictures)
- [ ] Real-time features (SSE/WebSockets)

**Phase 3 (After):** Frontend update
- [ ] Update API endpoints in frontend
- [ ] Test all features
- [ ] Deprecate PHP endpoints

## Installation & Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `.env` file in backend directory:

```bash
cp .env.example .env
```

Edit `.env`:
```
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/teacher_evaluation
SESSION_SECRET=your-secure-secret-key-here
CORS_ORIGIN=http://localhost:3000,http://localhost:8000
```

### 3. Start the Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001`

## Running Both Systems in Parallel

To keep both PHP and Node.js running simultaneously during migration:

### Option A: Use Different Ports

**PHP Backend (already running):**
- Port: 80 (or configured in Apache/XAMPP)
- URL: `http://localhost/teacher-eval/api/`

**Node.js Backend (new):**
- Port: 3001 (configured in `.env`)
- URL: `http://localhost:3001/api/`

### Option B: Use Reverse Proxy (Advanced)

Set up a proxy to route requests to appropriate backend based on URL pattern.

## API Compatibility

### Response Format (Same as PHP)

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

### Endpoint Mapping

| Feature | PHP Endpoint | Node.js Endpoint |
|---------|--------------|------------------|
| Teachers List | `GET /api/teachers.php?page=1&limit=10` | `GET /api/teachers?page=1&limit=10` |
| Teacher Detail | `GET /api/teachers.php?id=123` | `GET /api/teachers/123` |
| Create Teacher | `POST /api/teachers.php` | `POST /api/teachers` |
| Update Teacher | `POST /api/teachers.php?id=123` | `PUT /api/teachers/123` |
| Delete Teacher | `POST /api/teachers.php?delete=123` | `DELETE /api/teachers/123` |
| Login | `POST /api/login.php` | `POST /api/auth/login` |
| Logout | `GET /api/logout.php` | `POST /api/auth/logout` |

## Frontend Update Strategy

### Step 1: Create API Service Adapter

Modify `api-service.js` to detect which backend to use:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Or detect automatically:
const isNodeBackend = window.location.hostname === 'localhost' && 
                     window.location.port === '3000';
const API_BASE_URL = isNodeBackend ? 'http://localhost:3001/api' : '/teacher-eval/api';
```

### Step 2: Update Endpoint Calls

**Before (PHP):**
```javascript
fetch('/teacher-eval/api/teachers.php?page=1&limit=10')
```

**After (Node.js):**
```javascript
fetch('http://localhost:3001/api/teachers?page=1&limit=10')
```

### Step 3: Handle Authorization

**PHP:** Uses sessions stored in PHP
**Node.js:** Uses sessions stored in MongoDB

Both systems will handle sessions similarly, so no changes needed.

### Step 4: Feature-by-Feature Migration

1. **Teachers Management** ✅ (Ready)
   - Test with new Node backend
   - Switch admin panel to use Node.js
   
2. **Authentication** (In Progress)
   - Test login with Node backend
   
3. **Evaluations** (To Do)
   - Migrate endpoint
   - Test submission flow
   
4. **Others** (To Do)
   - Migrate remaining endpoints
   - Test all features

## Testing the Node.js Backend

### Health Check

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Teacher Evaluation API is running"
}
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Cared","password":"admin1234"}' \
  -c cookies.txt
```

### Get Teachers

```bash
curl http://localhost:3001/api/teachers?page=1&limit=10 \
  -b cookies.txt
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`

### CORS Issues
- Add frontend URL to `CORS_ORIGIN` in `.env`
- For dev: `CORS_ORIGIN=http://localhost:3000`

### Session Issues
- Ensure MongoDB session store is configured
- Check session secret in `.env`

### Port Already in Use
- Change PORT in `.env`
- Or kill existing process: `lsof -ti:3001 | xargs kill -9`

## Rollback Plan

If issues arise:

1. **Quick Rollback:** Keep PHP backend running
   - Update frontend to use old endpoints
   - Fix Node.js issues offline
   
2. **Data Sync:** Both backends share MongoDB
   - No data loss if switching between backends
   
3. **Session Preservation:** 
   - PHP: Uses PHP session store
   - Node.js: Uses MongoDB session store
   - May need to re-login when switching

## Next Steps

1. ✅ Install Node.js backend
2. ✅ Start development server: `npm run dev`
3. ⏳ Test teachers endpoint
4. ⏳ Migrate remaining endpoints
5. ⏳ Update frontend to use Node.js
6. ⏳ Deprecate PHP endpoints
7. ⏳ Deploy to production

## Questions?

Refer to:
- Node.js Backend README: `backend/README.md`
- Express Documentation: https://expressjs.com
- MongoDB Driver: https://www.mongodb.com/docs/drivers/node
