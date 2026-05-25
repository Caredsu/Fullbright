# 🚀 Socket.IO + Cloudinary Integration Guide

## Overview
This guide explains how to integrate:
1. **Socket.IO** - Real-time notifications when students submit evaluations
2. **Cloudinary** - Cloud image storage for teacher profile pictures

---

## 📦 Part 1: Installation

### Backend (Node.js)

```bash
cd backend
npm install socket.io cloudinary
```

### Admin React Panel

```bash
cd admin-react
npm install socket.io-client
```

---

## 🔧 Part 2: Configuration

### 1. Get Cloudinary API Keys

1. Go to [Cloudinary](https://cloudinary.com)
2. Sign up for free account
3. Go to Dashboard → Copy:
   - Cloud Name
   - API Key
   - API Secret

### 2. Update `.env` File

Create/update `backend/.env`:

```env
# Existing configs...
PORT=3001
MONGODB_URI=mongodb+srv://...

# Add these:
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

---

## 📂 Part 3: File Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── socket.js          ✨ NEW - Socket.IO setup
│   │   ├── cloudinary.js      ✨ NEW - Cloudinary config
│   │   └── database.js
│   ├── middlewares/
│   │   ├── uploadMiddleware.js ✨ NEW - Multer upload handler
│   │   └── auth.js
│   └── routes/
│       ├── upload.js           ✨ NEW - Image upload routes
│       └── ...other routes
├── server.js                   ✏️ UPDATED - Added Socket.IO
└── package.json               ✏️ UPDATED - Added dependencies

admin-react/src/
├── components/
│   ├── NotificationCenter.jsx  ✨ NEW - Real-time notifications UI
│   └── ImageUpload.jsx        ✨ NEW - Drag-drop image upload
├── services/
│   ├── socket.js              ✨ NEW - Socket.IO client
│   └── api.js
├── pages/
│   ├── Teachers.jsx           ✏️ UPDATED - Added image upload
│   └── ...other pages
└── styles/
    ├── notifications.css       ✨ NEW - Notification styling
    └── imageUpload.css        ✨ NEW - Upload styling
```

---

## 🎯 Part 4: How It Works

### Socket.IO Flow

```
1. Student submits evaluation
2. Backend receives submission
3. Backend emits 'new-evaluation' event
4. React admin component receives event via Socket.IO
5. NotificationCenter displays real-time alert
6. Admin sees notification instantly (no refresh needed)
```

### Cloudinary Flow

```
1. Admin clicks "Upload Image" in Teachers form
2. User drags/drops or selects image file
3. ImageUpload sends to backend: /api/upload/teacher-profile
4. Backend uploads to Cloudinary (not local disk)
5. Cloudinary returns secure URL
6. URL saved in teacher record in MongoDB
7. Image displayed using Cloudinary URL
```

---

## 💻 Part 5: Backend Setup (server.js)

**Already Updated ✅**

Key changes:
- Imported Socket.IO: `import http from 'http'`
- Created HTTP server for WebSocket: `const httpServer = http.createServer(app)`
- Initialized Socket.IO: `const io = initializeSocket(httpServer)`
- Added upload routes: `app.use('/api/upload', uploadRoutes)`
- Changed listener: `httpServer.listen()` instead of `app.listen()`

---

## 🎨 Part 6: Frontend Setup

### 6.1 Add NotificationCenter to Layout

Update `admin-react/src/pages/Dashboard.jsx`:

```jsx
import NotificationCenter from '../components/NotificationCenter';

export default function Dashboard() {
  return (
    <div>
      {/* Your existing header/layout */}
      <div className="header-right">
        <NotificationCenter />  {/* Add this line */}
      </div>
      {/* Rest of page */}
    </div>
  );
}
```

### 6.2 Image Upload Automatically in Teachers Form

**Already Updated ✅**

The Teachers.jsx component now includes:
- `<ImageUpload />` component above form fields
- Drag-and-drop interface
- Preview with remove button
- Auto upload to Cloudinary
- Stores URL in teacher record

---

## 🔌 Part 7: Using Socket.IO (Backend)

### Emit Evaluation Notification

In your evaluations route (`backend/src/routes/evaluations.js`):

```javascript
import { notifyNewEvaluation } from '../config/socket.js';

// After saving evaluation
const io = req.app.locals.io;
notifyNewEvaluation(io, {
  teacherId: evaluation.teacher_id,
  studentId: evaluation.student_id,
  averageRating: evaluation.average_rating,
  feedback: evaluation.feedback
});
```

### Emit Teacher Added Notification

```javascript
import { notifyTeacherAdded } from '../config/socket.js';

// After creating teacher
const io = req.app.locals.io;
notifyTeacherAdded(io, newTeacher);
```

---

## 📸 Part 8: Using Image Upload (Backend)

### Upload Route Endpoint

**POST** `/api/upload/teacher-profile`

```javascript
// From: admin-react/src/components/ImageUpload.jsx
const formData = new FormData();
formData.append('profileImage', file);

const response = await api.post('/api/upload/teacher-profile', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Response:
{
  success: true,
  data: {
    url: "https://res.cloudinary.com/...",
    publicId: "teacher-1234567890",
    size: 512000,
    width: 800,
    height: 600
  }
}
```

### Delete Old Image (if replacing)

```javascript
// Before uploading new image
const response = await api.delete(
  `/api/upload/teacher-profile/${oldPublicId}`
);
```

---

## 🧪 Part 9: Testing

### Test Socket.IO
1. Open admin dashboard in 2 browser windows
2. Submit evaluation from react_web
3. Both admin windows should show notification instantly ✅

### Test Image Upload
1. Go to Teachers page
2. Click "Add New Teacher"
3. Drag image or click to browse
4. Image uploads and previews ✅
5. Save teacher - image URL stored ✅

---

## 🐛 Part 10: Troubleshooting

### "Connection refused" on Socket.IO
- Ensure backend is running: `npm run dev` in `backend/` folder
- Check PORT in `.env` (should be 3001)
- Check CORS_ORIGINS includes frontend URLs

### Image Upload Fails
- Check Cloudinary credentials in `.env`
- Ensure file is under 5MB
- Check file type is image (JPEG, PNG, GIF, WebP)

### Notifications Not Appearing
- Check browser console for errors
- Verify admin is logged in (`adminId` in localStorage)
- Check Network tab → WebSocket connection active

---

## 📋 Part 11: NPM Packages Added

### Backend
```json
{
  "socket.io": "^4.x.x",
  "cloudinary": "^1.x.x"
}
```

### Admin React
```json
{
  "socket.io-client": "^4.x.x"
}
```

---

## 🎓 Beginner-Friendly Explanations

### What is Socket.IO?
- **Traditional HTTP**: Client asks server, server responds (one-way)
- **Socket.IO**: Connection stays open, server can push events instantly (bidirectional)
- **Analogy**: Like difference between email (HTTP) and phone call (Socket.IO)

### What is Cloudinary?
- **Local Storage**: Save files on your server hard drive (limited space)
- **Cloudinary**: Save files on cloud (unlimited, fast CDN delivery)
- **Analogy**: Like moving from a backpack to a cloud storage locker

### Why Not Store Images Locally?
1. Server disk space fills up
2. Harder to scale to multiple servers
3. Slower delivery to users far away
4. Need to manage disk backups

### Why Cloudinary?
1. Automatic CDN (fast delivery worldwide)
2. Image optimization (compression, resizing)
3. Backup & reliability
4. Free tier available

---

## ✅ Verification Checklist

- [ ] Backend `package.json` has `socket.io` and `cloudinary`
- [ ] Admin `package.json` has `socket.io-client`
- [ ] `.env` has Cloudinary keys
- [ ] `backend/server.js` updated with Socket.IO
- [ ] `backend/src/config/socket.js` created
- [ ] `backend/src/config/cloudinary.js` created
- [ ] `backend/src/middlewares/uploadMiddleware.js` created
- [ ] `backend/src/routes/upload.js` created
- [ ] `admin-react/src/services/socket.js` created
- [ ] `admin-react/src/components/NotificationCenter.jsx` created
- [ ] `admin-react/src/components/ImageUpload.jsx` created
- [ ] `admin-react/src/pages/Teachers.jsx` updated
- [ ] NotificationCenter added to Dashboard or layout
- [ ] Backend running: `npm run dev` in `backend/`
- [ ] Admin frontend running: `npm run dev` in `admin-react/`

---

## 🚀 Next Steps

1. Install packages in both folders
2. Add Cloudinary credentials to `.env`
3. Start backend: `npm run dev`
4. Start admin: `npm run dev`
5. Test real-time notifications
6. Test image uploads
7. Deploy to production

**Done! 🎉**
