# Admin React App

Complete admin panel for Teacher Evaluation System built with React, Vite, and Bootstrap.

## 📁 Project Structure

```
admin-react/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx      - Navigation sidebar
│   │   ├── TopBar.jsx       - User menu & logout
│   │   ├── DataTable.jsx    - Reusable data table
│   │   └── FormModal.jsx    - Reusable form modal
│   ├── pages/
│   │   ├── Login.jsx        - Authentication
│   │   ├── Dashboard.jsx    - Overview & stats
│   │   ├── Users.jsx        - User management
│   │   ├── Teachers.jsx     - Teacher management
│   │   ├── Questions.jsx    - Question management
│   │   ├── Results.jsx      - Evaluation results
│   │   ├── Analytics.jsx    - Advanced analytics
│   │   └── Settings.jsx     - System settings
│   ├── services/
│   │   └── api.js           - Axios API client
│   ├── styles/
│   │   └── main.css         - Global styles
│   ├── App.jsx              - Main app component
│   └── main.jsx             - React entry point
├── public/                  - Static assets
├── vite.config.js          - Vite configuration
├── package.json            - Dependencies
└── index.html              - HTML template
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Node.js backend running on `localhost:3001`

### Installation

```bash
cd admin-react
npm install
```

### Development

```bash
npm run dev
```

Opens on `http://localhost:3002` automatically.

### Build for Production

```bash
npm run build
```

Outputs to `../admin/` folder (ready for deployment).

## 🔐 Authentication

**Demo Credentials:**
- Username: `superadmin`
- Password: `superadmin123`

Token is stored in `localStorage` as `adminToken`.

## 🔗 API Integration

All API calls go to `http://localhost:3001/api/`

Implemented endpoints:
- **Auth**: `/auth/login`, `/auth/logout`
- **Users**: GET, POST, PUT, DELETE
- **Teachers**: GET, POST, PUT, DELETE
- **Questions**: GET, POST, PUT, DELETE
- **Evaluations**: GET, PATCH (update status)
- **Analytics**: Dashboard, teacher stats, evaluation stats
- **Departments**: GET all
- **Surveys**: GET, results

## 📋 Pages & Features

### Login
- Email/password authentication
- Token-based session
- Auto-redirect if logged out

### Dashboard
- Overall statistics
- Teacher count, evaluation count, user count
- Average ratings
- System status indicators

### Users Management
- Create, read, update, delete admin users
- Role assignment (admin, super_admin)
- Status management
- Modal form with validation

### Teachers Management
- Full CRUD operations
- Department selection
- Email validation
- Status toggle

### Questions Management
- Question text management
- Category & type selection
- Display order configuration
- Required flag toggle

### Results
- View all evaluations
- Filter by status
- View teacher ratings
- Display evaluation dates

### Analytics
- Teacher performance trends
- Evaluation distribution
- Department performance
- (Charts placeholder - ready for Chart.js integration)

### Settings
- System name & email
- Support contact
- Evaluation settings
- Rating scale configuration

## 🎨 UI Components

### DataTable
Reusable component for displaying data with CRUD actions.

```jsx
<DataTable
  columns={columns}
  data={data}
  loading={loading}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

### FormModal
Reusable modal form with validation.

```jsx
<FormModal
  isOpen={showModal}
  title="Add User"
  fields={fields}
  onSubmit={handleSubmit}
  onClose={handleClose}
/>
```

## 🔧 Environment Variables

Create `.env` file in `admin-react/` root:

```env
VITE_API_BASE=http://localhost:3001/api
```

## 📦 Dependencies

- **react** - UI library
- **react-dom** - DOM rendering
- **react-router-dom** - Client routing
- **axios** - HTTP client
- **vite** - Build tool
- **@vitejs/plugin-react** - React plugin for Vite

## 🎯 Development Tips

1. **Hot Reload**: Changes auto-reload in browser
2. **CORS**: Backend already configured for admin requests
3. **Token Persistence**: Logged-in session persists on page reload
4. **Error Handling**: All API errors caught and displayed
5. **Responsive**: Sidebar collapses on mobile

## 📝 Notes

- Same API patterns as `react_web/` for consistency
- Bootstrap 5 for styling (same as admin PHP pages)
- Sidebar navigation (same as traditional admin panels)
- Modal forms for all CRUD operations
- Data tables with action buttons

## 🚀 Deployment

Build outputs to `../admin/` folder. Deploy as static files to your web server.

```bash
npm run build
# Output: ../admin/index.html, ../admin/assets/*, etc.
```

Then serve from your server's admin path.
