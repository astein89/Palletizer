# Setup Instructions

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `backend/.env` file:
```
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
DB_PATH=./data/palletizer.db
```

### 3. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### 5. Default Login

- Username: `admin`
- Password: `admin`

## What's Been Built

### ✅ Completed Features

1. **Project Structure** - Full TypeScript setup for both backend and frontend
2. **Database** - SQLite with schema for users, pallets, items, and change_history
3. **Authentication** - JWT-based auth with login, protected routes, user context
4. **Change Tracking** - Audit logger for all CRUD operations
5. **Palletizing Algorithm** - Core bin-packing with rotation support and weight constraints
6. **Backend API** - Complete REST API for auth, palletize, pallets, items, users
7. **UI Theme** - Dark mode by default with Tailwind CSS
8. **Authentication UI** - Login page, protected routes, user menu
9. **Pallet Management** - Full CRUD interface with weight fields
10. **Item Management** - Full CRUD interface with composite key support
11. **Box Input Component** - Manual entry, pallet dropdown, item lookup
12. **3D Visualization** - Basic Three.js visualization of pallet arrangements
13. **Results Display** - Statistics panel with weight information
14. **Loading States** - Loading spinner component

### 🚧 Remaining Features (from PLAN.md)

1. **Batch Processing** - CSV/XLSX file upload and batch calculations
2. **Photo Generation** - Auto-create images for batch results
3. **PDF Export** - Formatted PDF reports with layout diagrams
4. **CSV/Excel Export** - Export results to CSV and Excel formats
5. **Change History Component** - UI to view audit trail
6. **Enhanced 3D Visualization** - Layer-by-layer view, orientation indicators, view controls
7. **File Upload UI** - Drag-and-drop file upload component
8. **Batch Results Component** - Display and manage batch processing results

## Next Steps

To complete the remaining features, you'll need to:

1. Add file upload handling (multer middleware)
2. Implement batch processing route
3. Add PDF generation using pdfkit or puppeteer
4. Add CSV/Excel export utilities
5. Build change history viewer component
6. Enhance 3D visualization with more controls
7. Add batch results management UI

## Development Notes

- The database is automatically initialized on first run
- Default admin user is created if no users exist
- All API routes require authentication except `/api/auth/login`
- User management routes require admin role
- Change history is automatically logged for all CRUD operations
