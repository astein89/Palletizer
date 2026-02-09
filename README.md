# Palletizer - Web-Based Palletizing Optimization System

A full-stack web application for optimizing box placement on pallets using advanced bin-packing algorithms.

## Features

- **Palletizing Algorithm**: Optimizes box placement with rotation support and weight constraints
- **3D Visualization**: Interactive Three.js visualization of pallet arrangements
- **Pallet Management**: CRUD operations for pallet types with weight capacity
- **Item Management**: Store box dimensions by Item ID, UOM, and Qty (composite key)
- **User Authentication**: JWT-based authentication with role-based access control
- **Change Tracking**: Complete audit trail of all modifications
- **Dark Mode UI**: Professional dark theme by default
- **Export Options**: PDF, CSV, and Excel export of results
- **Batch Processing**: Process multiple configurations from CSV/XLSX files

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- SQLite database
- JWT authentication
- bcrypt for password hashing

### Frontend
- React + TypeScript
- Vite
- Three.js for 3D visualization
- Tailwind CSS (dark mode)
- React Router
- Axios for API calls

## Quick Start

See [QUICK_START.md](QUICK_START.md) for detailed setup instructions.

### Quick Setup

**Backend:**
```bash
cd backend
npm install
npm run dev
```

The backend will run on `http://localhost:3001`

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

**Default admin credentials:**
- Username: `admin`
- Password: `admin` (change after first login!)

## Documentation

- [SETUP.md](SETUP.md) - Detailed setup instructions
- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [NETWORK_ACCESS.md](NETWORK_ACCESS.md) - Access from other devices
- [RASPBERRY_PI_DEPLOYMENT.md](RASPBERRY_PI_DEPLOYMENT.md) - Deploy on Raspberry Pi 5
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

## Project Structure

```
Palletizer/
├── backend/
│   ├── src/
│   │   ├── algorithms/     # Palletizing algorithm
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth middleware
│   │   ├── database/        # Database setup
│   │   ├── utils/           # Utilities (audit logger, etc.)
│   │   └── server.ts        # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API services
│   │   ├── styles/          # CSS styles
│   │   └── types/           # TypeScript types
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/password` - Change password
- `POST /api/auth/register` - Register user (admin only)

### Palletizing
- `POST /api/palletize` - Calculate optimal arrangement

### Pallets
- `GET /api/pallets` - List all pallets
- `GET /api/pallets/:id` - Get pallet by ID
- `POST /api/pallets` - Create pallet
- `PUT /api/pallets/:id` - Update pallet
- `DELETE /api/pallets/:id` - Delete pallet
- `GET /api/pallets/:id/history` - Get change history

### Items
- `GET /api/items` - List all items
- `GET /api/items/:itemId/:uom/:qty` - Get item by composite key
- `POST /api/items` - Create/update item
- `PUT /api/items/:itemId/:uom/:qty` - Update item
- `DELETE /api/items/:itemId/:uom/:qty` - Delete item
- `GET /api/items/:itemId/:uom/:qty/history` - Get change history

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Algorithm Features

- **Rotation Support**: Boxes can be rotated on length×width plane (2 orientations) or all 6 orientations if height rotation is enabled
- **Mixed Orientations**: Different boxes on the same layer can use different orientations
- **Stability Rule**: Layers with mixed orientations are rotated 180° for pallet stability
- **Weight Constraints**: Arrangements are limited by pallet weight capacity
- **Layer Optimization**: Maximizes boxes per layer using 2D bin-packing

## License

ISC
