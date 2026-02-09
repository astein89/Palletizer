# Quick Start Guide

## Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

## Setup Steps

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Create Backend Environment File
Create `backend/.env` with:
```
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
DB_PATH=./data/palletizer.db
```

### 4. Start Backend Server
```bash
cd backend
npm run dev
```
You should see:
- "Connected to SQLite database"
- "Database schema initialized"
- "Default admin user created (username: admin, password: admin)"
- "Server running on port 3001"

### 5. Start Frontend (in a new terminal)
```bash
cd frontend
npm run dev
```
You should see:
- "Local: http://localhost:3000"

## Testing the Application

### 1. Login
- Open http://localhost:3000
- Username: `admin`
- Password: `admin`

### 2. Create a Pallet
- Navigate to "Pallets" in the menu
- Click "Add Pallet"
- Fill in:
  - Name: "Standard Pallet"
  - Length: 48
  - Width: 40
  - Height: 6
  - Max Length: 48
  - Max Width: 40
  - Max Height: 84
  - Max Weight: 2000
  - Pallet Weight: 50
- Click "Create"

### 3. Create an Item
- Navigate to "Items" in the menu
- Click "Add Item"
- Fill in:
  - Item ID: "BOX-001"
  - UOM: "EA"
  - Qty: 1
  - Name: "Standard Box"
  - Length: 12
  - Width: 10
  - Height: 8
  - Weight: 5
- Click "Create"

### 4. Calculate Palletizing
- Navigate to "Palletize" (home page)
- Select the pallet you created
- Optionally select the item (will auto-fill dimensions)
- Or manually enter:
  - Length: 12
  - Width: 10
  - Height: 8
  - Weight: 5
- Click "Calculate"
- View the results and 3D visualization

### 5. Test Weight Constraints
- Create a pallet with low max_weight (e.g., 100)
- Calculate with a box that would exceed the weight
- Verify the arrangement is limited by weight

### 6. Test Height Rotation
- In the palletize calculator, check "Allow height rotation"
- Calculate and see if more boxes fit

## Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Verify Node.js version (node --version)
- Check that all dependencies installed correctly

### Frontend won't start
- Check if port 3000 is already in use
- Verify Vite is installed correctly
- Check browser console for errors

### Database errors
- Delete `backend/data/palletizer.db` and restart backend
- Check that the data directory exists

### API connection errors
- Verify backend is running on port 3001
- Check browser console for CORS or network errors
- Verify the proxy in `frontend/vite.config.ts`

## What to Test

✅ **Authentication**
- Login with admin/admin
- Try accessing protected routes without login
- Logout functionality

✅ **Pallet Management**
- Create, edit, view pallets
- Verify weight fields are saved

✅ **Item Management**
- Create items with Item ID + UOM + Qty
- Edit existing items
- Verify composite key uniqueness

✅ **Palletizing Calculation**
- Calculate with different box sizes
- Test with and without height rotation
- Verify weight constraints work
- Check results display correctly

✅ **3D Visualization**
- Verify boxes are displayed
- Check that layers are visible
- Test that visualization updates on new calculations

✅ **Weight Calculations**
- Test arrangements that exceed weight limits
- Verify weight utilization percentage
- Check weight-limited indicator appears

## Expected Behavior

- All CRUD operations should show success/error toasts
- Loading states should appear during API calls
- 3D visualization should render boxes on a pallet
- Results should show accurate box counts and weight info
- Navigation should work between pages
