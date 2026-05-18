# React PWA - Quick Reference & Scripts

## 🚀 Quick Start

```bash
# Navigate to react_web folder
cd c:\xampp\htdocs\teacher-eval\react_web

# Install dependencies (one time)
npm install

# Start development
npm run dev
# → Opens http://localhost:5173/

# Build for production
npm run build
# → Builds to ../pwa/ automatically

# Preview production build locally
npm run preview
# → Opens http://localhost:4173/
```

## 📦 Available Scripts (from package.json)

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start dev server with HMR |
| `build` | `vite build` | Minify & build to ../pwa/ |
| `preview` | `vite preview` | Preview production build |
| `lint` | (optional) | Check code quality |

## 🔧 Environment Setup

### Requirements
- Node.js v26.1.0+ ✅
- npm v11.13.0+ ✅
- Apache with mod_rewrite ✅
- PHP 7.0+ ✅

### Check Installation
```bash
node --version  # Should be v26.1.0+
npm --version   # Should be 11.13.0+
```

## 📝 File Structure Quick Map

```
react_web/
├── src/
│   ├── App.jsx              # Main app + router
│   ├── main.jsx             # Entry point
│   ├── App.css              # Global styles
│   ├── pages/
│   │   ├── Login.jsx        # /login route
│   │   ├── Dashboard.jsx    # /dashboard route
│   │   └── Evaluation.jsx   # /evaluate/:id route
│   ├── services/
│   │   └── api.js           # Axios instance with proxy
│   ├── styles/
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   └── evaluation.css
│   └── hooks/               # Custom React hooks (empty for now)
├── public/                  # Static assets (optional)
├── index.html               # HTML template
├── vite.config.js           # Build config
├── package.json             # Dependencies & scripts
└── node_modules/            # Installed packages
```

## 🎯 Key Components

### Login Page
- **File**: `src/pages/Login.jsx`
- **Route**: `/login`
- **Features**: Email/password auth, token storage

### Dashboard Page
- **File**: `src/pages/Dashboard.jsx`
- **Route**: `/dashboard` (default)
- **Features**: Teacher grid, evaluate button

### Evaluation Page
- **File**: `src/pages/Evaluation.jsx`
- **Route**: `/evaluate/:teacherId`
- **Features**: 5-star questions, submit form

### API Service
- **File**: `src/services/api.js`
- **Features**: Axios instance with auth interceptors
- **Base URL**: `/pwa/api/` (proxied to `/api/`)

## 🔄 Development Workflow

### 1. Code Changes
```bash
# Edit any file in src/
code src/pages/Dashboard.jsx

# Changes auto-reload in browser (HMR)
```

### 2. Test Changes
```bash
# Start dev server
npm run dev

# Navigate to http://localhost:5173/
# Test your changes
```

### 3. Deploy Changes
```bash
# Build for production
npm run build

# Check output
ls ../pwa/assets/

# Done! Changes are in ../pwa/
```

## 🔗 API Endpoints Used

The app makes requests to these endpoints (via `/pwa/api/` proxy):

- `POST /api/login.php` - User login
- `GET /api/teachers.php` - List teachers
- `GET /api/teachers-simple.php?id=X` - Get teacher
- `GET /api/questions.php` - Get evaluation questions
- `POST /api/evaluations.php` - Submit evaluation

## 🐛 Debugging

### Browser DevTools
```javascript
// Check PWA base path
console.log(window.PWA_BASE_PATH)

// Check service worker
navigator.serviceWorker.getRegistrations()
```

### Network Tab
- Watch `/pwa/api/` calls being proxied to `/api/`
- Check response status & headers
- Verify cache behavior

### Application Tab
- Check service worker status
- View manifest.json
- Check local storage (auth_token)

## 📊 Build Output

After `npm run build`, check:

```
pwa/
├── index.html                    # ~1.2 KB (gzipped: 0.52 KB)
├── assets/
│   ├── index-{hash}.css          # ~9.82 KB (gzipped: 2.72 KB)
│   ├── index-{hash}.js           # ~7.86 KB (gzipped: 2.71 KB)
│   └── react-vendor-{hash}.js    # ~273 KB (gzipped: 90 KB)
├── manifest.json
├── service-worker.js
└── favicon.svg
```

**Total**: ~100 KB gzipped (excellent for PWA)

## 🆘 Common Issues

### Issue: "Module not found"
```bash
npm install  # Reinstall all dependencies
```

### Issue: Build fails with "terser not found"
```bash
npm install terser
npm run build
```

### Issue: Changes not appearing in browser
```bash
# For development (HMR should auto-reload)
npm run dev

# For production (clear cache)
npm run build
# Clear browser cache in DevTools
```

### Issue: API calls return 503
- Check if `/api/` endpoints are accessible
- Verify `pwa/api.php` is in place
- Check Apache error log

### Issue: Service worker not registering
- Open DevTools → Application → Service Workers
- Check browser console for errors
- Ensure site is https:// in production

## 📱 Testing PWA

### On Desktop
```
1. npm run dev  (or build + preview)
2. Open http://localhost:5173/
3. Open DevTools → Application
4. Check "Service Workers" section
```

### On Mobile (via ngrok or similar)
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 5173

# Share the https://xxxx.ngrok.io URL
# Test on phone with PWA installation
```

## 📋 Checklists

### Before Deploy
- [ ] `npm run build` completes without errors
- [ ] No console errors in DevTools
- [ ] API calls return correct data
- [ ] Login redirects properly
- [ ] Evaluate form submits successfully

### After Deploy
- [ ] `/pwa/` loads React app
- [ ] `/pwa/login` works
- [ ] `/pwa/dashboard` shows teachers
- [ ] `/pwa/api/*` calls proxied correctly
- [ ] Service worker registered

## 🎓 Learning Resources

- [React Docs](https://react.dev/)
- [Vite Guide](https://vite.dev/)
- [React Router](https://reactrouter.com/)
- [Axios Docs](https://axios-http.com/)
- [PWA Docs](https://web.dev/progressive-web-apps/)

## 🔑 Key Commands Memo

```bash
# Install once
npm install

# Development
npm run dev          # Hot reload server

# Production
npm run build        # Build to ../pwa/
npm run preview      # Preview build locally

# Other
npm list             # Show all packages
npm audit            # Security check
npm update           # Update packages
```

---

**Pro Tip**: Use VS Code with ES7+ snippets for faster React development! 🚀

**File**: `react_web/QUICK_REFERENCE.md`
**Last Updated**: May 18, 2026
