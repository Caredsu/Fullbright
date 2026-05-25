# Teacher Evaluation System - Node.js Backend

Node.js Express backend for the Teacher Evaluation System, migrated from PHP.

## Features

- ✅ Express.js REST API
- ✅ MongoDB integration
- ✅ Session-based authentication
- ✅ Server-side pagination
- ✅ Role-based access control
- ✅ CORS enabled
- ✅ Error handling middleware

## Project Structure

```
backend/
├── src/
│   ├── config/        # Database configuration
│   ├── controllers/   # Request handlers
│   ├── middlewares/   # Express middlewares
│   ├── routes/        # API route definitions
│   └── utils/         # Utility functions
├── server.js          # Main entry point
├── package.json       # Dependencies
└── .env.example       # Environment variables template
```

## Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   ```
   NODE_ENV=development
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/teacher_evaluation
   SESSION_SECRET=your-secret-key
   CORS_ORIGIN=http://localhost:3000
   ```

3. **Start the server:**
   ```bash
   # Development (with auto-reload)
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user

### Teachers
- `GET /api/teachers?page=1&limit=10` - Get all teachers (paginated)
- `GET /api/teachers/:id` - Get teacher by ID
- `POST /api/teachers` - Create teacher (admin only)
- `PUT /api/teachers/:id` - Update teacher (admin only)
- `DELETE /api/teachers/:id` - Delete teacher (admin only)

### Other Endpoints
- `GET /api/evaluations` - Evaluations
- `GET /api/questions` - Questions
- `GET /api/users` - Users management
- `GET /api/analytics` - Analytics data
- `GET /api/departments` - List departments

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | development |
| `PORT` | Server port | 3001 |
| `MONGODB_URI` | MongoDB connection | mongodb://localhost:27017/teacher_evaluation |
| `SESSION_SECRET` | Session encryption key | dev-secret-key |
| `JWT_SECRET` | JWT token secret | - |
| `CORS_ORIGIN` | Allowed CORS origins | http://localhost:3000 |

## Development

- **Auto-reload:** Uses `nodemon` for development
- **Environment:** Load from `.env` file
- **Error handling:** Centralized error middleware

## Migration from PHP

This backend is a direct replacement for the PHP API endpoints:

**PHP Endpoint** → **Node.js Endpoint**
- `/api/teachers.php` → `GET /api/teachers`
- `/api/login.php` → `POST /api/auth/login`
- `/api/evaluations.php` → `GET /api/evaluations`
- etc.

The API responses maintain the same JSON structure for frontend compatibility.

## Database

MongoDB collections used:
- `teachers` - Teacher information
- `users` - User accounts and authentication
- `evaluations` - Teacher evaluations
- `questions` - Evaluation questions
- `sessions` - Express sessions (for session store)

## Notes

- Session data is stored in MongoDB (via `connect-mongo`)
- Passwords are hashed with bcryptjs
- CORS is enabled for frontend communication
- All API routes require proper authentication headers
