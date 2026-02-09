---
name: Web Palletizing System
overview: Build a full-stack web application for palletizing optimization with React frontend and Node.js backend, featuring 3D visualization, pallet/box management, batch processing, and automated photo generation.
todos: []
---

# Web-Based Palletizing Optimization System

## Architecture Overview

Full-stack application with React + TypeScript frontend and Node.js + Express backend. The system will optimize box placement on pallets using a bin-packing algorithm that considers all box rotations.

## Technology Stack

- **Frontend**: React + TypeScript, Three.js for 3D visualization, React Router
- **UI Styling**: Dark mode by default, CSS-in-JS or Tailwind CSS with dark theme
- **Backend**: Node.js + Express, TypeScript
- **File Processing**: `xlsx` for Excel, `csv-parse` for CSV
- **Image Generation**: `html2canvas` or `puppeteer` for batch photo generation
- **PDF Generation**: `pdfkit` or `puppeteer` for PDF export
- **Authentication**: JWT tokens, bcrypt for password hashing
- **Database**: SQLite for pallet types, item dimensions, users, and audit trail

## Core Components

### Backend (`/backend`)

1. **Palletizing Algorithm** (`src/algorithms/palletizer.ts`)

   - **Rotation Constraints**: 
     - **Default Mode (allowHeightRotation = false)**: Box height dimension is ALWAYS vertical (never rotated)
       - Only 2 orientations allowed: `length×width` and `width×length` (rotating on horizontal plane)
     - **Extended Mode (allowHeightRotation = true)**: Height dimension can be rotated
       - All 6 orientations allowed: l×w×h, l×h×w, w×l×h, w×h×l, h×l×w, h×w×l
       - Algorithm tries all 6 orientations to find optimal arrangement
     - Each box can be individually rotated per layer to maximize fit
     - **Configuration Option**: `allowHeightRotation` (boolean, default: false)
       - User-configurable setting in UI
       - Stored per calculation request
       - Can be saved as preference per item/pallet combination

   - **Layer-by-Layer Optimization**:
     - For each layer, algorithm tries different combinations of box orientations
     - Uses 2D bin-packing (Bottom-Left-Fill or similar) to place boxes within layer footprint
     - Tracks which boxes use which orientation (l×w vs w×l) within the same layer
     - Calculates total boxes that fit per layer

   - **Stability Rule**:
     - If a layer uses mixed orientations (some boxes l×w, some w×l), the next layer is rotated 180° around vertical axis
     - This ensures interlocking pattern for pallet stability
     - Rotation alternates: normal → 180° → normal → 180° (when mixed orientations detected)

   - **Algorithm Steps** (when allowHeightRotation = false, default):

     1. Try uniform orientation (all boxes l×w) - calculate layer arrangement
     2. Try uniform orientation (all boxes w×l) - calculate layer arrangement
     3. Try mixed orientations - use greedy algorithm to place boxes, trying both orientations for each box placement
     4. Select best arrangement (maximizes boxes per layer)
     5. Stack layers up to max height, applying 180° rotation when previous layer had mixed orientations
     6. Return: arrangement data with box positions, orientations, layer rotations, and statistics

   - **Algorithm Steps** (when allowHeightRotation = true):

     1. For each of 6 possible orientations (l×w×h, l×h×w, w×l×h, w×h×l, h×l×w, h×w×l):
        - Calculate how many boxes fit per layer
        - Stack layers up to max height
        - Track total boxes
     2. Try mixed orientations within layers - use greedy algorithm, trying all 6 orientations for each box placement
     3. Select best arrangement (maximizes total boxes)
     4. Stack layers with stability rule (180° rotation when mixed orientations used)
     5. Return: arrangement data with box positions, orientations (all 6 types), layer rotations, and statistics

   - **Weight Considerations**:
     - Calculate total weight: (number of boxes × box weight) + pallet weight
     - Validate against pallet max_weight capacity
     - If weight limit exceeded, reduce number of layers/boxes to fit within weight constraint
     - Display weight utilization percentage
     - Weight takes precedence over maximizing box count if weight limit is reached

   - **Return Data Structure**:
     ```typescript
     {
       totalBoxes: number,
       totalLayers: number,
       boxesPerLayer: number[],
       allowHeightRotation: boolean, // whether height rotation was allowed
       totalWeight: number, // total weight including pallet
       weightUtilization: number, // percentage of max weight used
       weightLimited: boolean, // true if arrangement was limited by weight
       layers: Array<{
         layerNumber: number,
         rotation: 0 | 180, // degrees around vertical axis
         boxes: Array<{
           x, y, z: number, // position
           orientation: 'l×w' | 'w×l' | 'l×h' | 'h×l' | 'w×h' | 'h×w', // box orientation
           boxLength, boxWidth, boxHeight: number, // actual dimensions (effective dimensions based on orientation)
           boxWeight: number // weight of this box
         }>
       }>
     }
     ```


2. **API Endpoints** (`src/routes/`)

   - **Authentication**:
     - `POST /api/auth/login` - User login
     - `POST /api/auth/logout` - User logout
     - `GET /api/auth/me` - Get current user info
     - `POST /api/auth/register` - Register new user (admin only)
     - `PUT /api/auth/password` - Change password

   - **Palletizing**:
     - `POST /api/palletize` - Calculate optimal arrangement (requires auth)
       - Request body includes: `allowHeightRotation` (boolean, default: false), `palletId` (integer), box dimensions, box weight
       - Accepts box dimensions, pallet type (by ID), weight, and rotation configuration
       - Returns arrangement with weight calculations

   - **Pallets**:
     - `GET /api/pallets` - List all pallet types (requires auth)
     - `POST /api/pallets` - Create pallet type (requires auth, tracks user)
     - `PUT /api/pallets/:id` - Update pallet type (requires auth, tracks user)
     - `DELETE /api/pallets/:id` - Delete pallet type (requires auth, tracks user)
     - `GET /api/pallets/:id/history` - Get change history for pallet

   - **Items**:
     - `GET /api/items` - List all items (requires auth)
     - `POST /api/items` - Create/update item (requires auth, tracks user)
     - `GET /api/items/:itemId/:uom/:qty` - Get item by composite key (Item ID + UOM + Qty)
     - `PUT /api/items/:itemId/:uom/:qty` - Update item (requires auth, tracks user)
     - `DELETE /api/items/:itemId/:uom/:qty` - Delete item (requires auth, tracks user)
     - `GET /api/items/:itemId/:uom/:qty/history` - Get change history for item

   - **Batch Processing**:
     - `POST /api/batch` - Process batch file (CSV/XLSX) (requires auth)
     - `POST /api/generate-images` - Generate photos for batch results (requires auth)
     - `POST /api/export-pdf` - Generate and download PDF report (requires auth)
     - `POST /api/export-csv` - Export results to CSV (requires auth)
     - `POST /api/export-excel` - Export results to Excel/XLSX (requires auth)

   - **Users** (Admin only):
     - `GET /api/users` - List all users
     - `POST /api/users` - Create user
     - `PUT /api/users/:id` - Update user
     - `DELETE /api/users/:id` - Delete user

3. **File Parser** (`src/utils/fileParser.ts`)

   - Parse CSV/XLSX files
   - Extract box dimensions, weights, and pallet configurations
   - Validate data format
   - Required columns: Item ID, UOM, Qty, length, width, height, weight
   - Optional columns: allowHeightRotation, palletId

4. **Database** (`src/database/`)

   - SQLite database with tables:
     - `users`: User accounts
       - Columns: `id` (INTEGER PRIMARY KEY), `username` (TEXT UNIQUE), `email` (TEXT), `password_hash` (TEXT), `role` (TEXT: 'admin' | 'user'), `created_at` (DATETIME), `last_login` (DATETIME)

     - `pallets`: Store pallet type definitions
       - Columns: `id` (INTEGER PRIMARY KEY), `name` (TEXT), `length` (REAL), `width` (REAL), `height` (REAL), `max_length` (REAL), `max_width` (REAL), `max_height` (REAL), `max_weight` (REAL), `pallet_weight` (REAL), `created_by` (INTEGER, FK to users.id), `modified_by` (INTEGER, FK to users.id), `created_at` (DATETIME), `updated_at` (DATETIME)
       - `max_weight`: Maximum total weight capacity (including pallet weight)
       - `pallet_weight`: Weight of the empty pallet itself

     - `items`: Store box dimensions by composite key (Item ID + UOM + Qty)
       - Columns: `item_id` (TEXT), `uom` (TEXT), `qty` (REAL), `name` (TEXT), `length` (REAL), `width` (REAL), `height` (REAL), `weight` (REAL), `description` (TEXT), `allow_height_rotation` (BOOLEAN, default: false), `created_by` (INTEGER, FK to users.id), `modified_by` (INTEGER, FK to users.id), `created_at` (DATETIME), `updated_at` (DATETIME)
       - `weight`: Weight per box (in same unit as pallet max_weight)
       - PRIMARY KEY: (`item_id`, `uom`, `qty`) - Composite key for unique identification
       - `allow_height_rotation`: Per-item preference for allowing height rotation (can be overridden per calculation)

     - `change_history`: Audit trail for all modifications
       - Columns: `id` (INTEGER PRIMARY KEY), `table_name` (TEXT), `record_id` (TEXT), `action` (TEXT: 'CREATE' | 'UPDATE' | 'DELETE'), `user_id` (INTEGER, FK to users.id), `old_values` (TEXT JSON), `new_values` (TEXT JSON), `changed_fields` (TEXT JSON), `timestamp` (DATETIME), `ip_address` (TEXT)
       - Tracks all changes to pallets and items
       - Stores before/after values for updates

   - Database schema and migration files
   - **Composite Key for Items**: 
     - Primary key is combination of `(item_id, uom, qty)`
     - Allows same Item ID to exist with different UOM (Unit of Measure) and Qty (Quantity) combinations
     - Example: Item "BOX-001" can have:
       - (BOX-001, "EA", 1) - Each, quantity 1
       - (BOX-001, "EA", 12) - Each, quantity 12
       - (BOX-001, "CS", 1) - Case, quantity 1
     - Each combination can have different dimensions
     - Lookups require all three values: Item ID + UOM + Qty

5. **Authentication Middleware** (`src/middleware/auth.ts`)

   - JWT token validation
   - Role-based access control (admin vs user)
   - User context injection into requests
   - Session management

6. **Change Tracking** (`src/utils/auditLogger.ts`)

   - Automatic logging of all CREATE, UPDATE, DELETE operations
   - Captures: user, timestamp, old/new values, changed fields
   - Stores in `change_history` table
   - Provides change history API endpoints
   - Tracks IP addresses for security

7. **Export Generators** (`src/utils/`)

   - **PDF Generator** (`pdfGenerator.ts`)

   - Generate nicely formatted PDF reports using `pdfkit` or `puppeteer`
   - PDF content includes:
     - Header with title and date
     - Pallet information (dimensions, max dimensions, max weight, pallet weight)
     - Box/Item information (Item ID, UOM, Qty, name, dimensions, weight)
     - Rotation mode (height rotation allowed: yes/no)
     - Weight summary (total weight, max weight, utilization)
     - User information (who generated the report)
     - **2D top-view layout diagrams** showing box arrangement per layer
       - Visual distinction for box orientations (l×w vs w×l)
       - Layer rotation indicators (180° rotation marked)
       - Layer numbers and box counts
     - **Layer-by-layer breakdown table**:
       - Layer number, rotation angle, boxes per layer
       - Orientation breakdown (how many l×w vs w×l)
       - Layer dimensions and utilization
     - Statistics summary (total boxes, boxes per layer, total layers, utilization percentage)
     - Optional: Side view and front view diagrams
   - Professional formatting with company branding area, clear sections, and tables
   - Include visual legend explaining orientation indicators

   - **CSV/Excel Exporter** (`csvExporter.ts`, `excelExporter.ts`)
     - Export palletizing results to CSV format
     - Export palletizing results to Excel/XLSX format
     - Include all statistics: boxes, layers, weights, orientations
     - Layer-by-layer breakdown in separate sheets/tabs (Excel)
     - Include metadata: timestamp, user, pallet info, box info

### Frontend (`/frontend`)

0. **UI Theme & Styling** (`src/styles/` or Tailwind config)

   - **Dark mode by default** - All UI components use dark theme
   - Dark color scheme: dark backgrounds, light text, high contrast
   - Consistent dark theme across all components
   - Dark mode for Three.js visualization scene
   - Dark-themed PDF exports (optional, or keep PDFs light for printing)
   - CSS variables or theme configuration for easy maintenance
   - Professional dark UI with good contrast ratios for accessibility

0.5. **Loading States & UI Feedback** (`src/components/common/`)

   - **Loading Spinner Component** - Reusable spinner/loader component
   - **Loading Overlay** - Full-page or section overlay during operations
   - **Progress Indicators** - Progress bars for batch operations
   - **Skeleton Loaders** - Placeholder content while data loads
   - **Button Loading States** - Disabled buttons with spinners during actions
   - **Toast Notifications** - Success/error/info messages for user feedback
   - Apply loading states to:
     - API calls (palletize calculation, CRUD operations)
     - File uploads and batch processing
     - Export generation (PDF, CSV, Excel)
     - Image generation
     - Data fetching

1. **Authentication** (`src/components/Auth/`)

   - `Login.tsx` - Login form with username/password
   - `ProtectedRoute.tsx` - Route wrapper requiring authentication
   - `UserContext.tsx` - Global user state management
   - `UserMenu.tsx` - User dropdown with logout, profile options
   - Session persistence (localStorage/cookies)

2. **Pallet Management** (`src/components/PalletManager.tsx`)

   - CRUD interface for pallet types
   - Fields: name, length, width, height, max_length, max_width, max_height, max_weight, pallet_weight
   - **Weight Fields**: 
     - `max_weight`: Maximum total weight capacity (including pallet)
     - `pallet_weight`: Weight of empty pallet
   - **Loading States**: Show loading indicators during CRUD operations
   - **Change History View** - Show who modified what and when
   - Display created_by and modified_by user names
   - View change history timeline

3. **Box Input** (`src/components/BoxInput.tsx`)

   - Manual entry form (length, width, height, weight)
   - **Pallet Type Selector**: Dropdown/select to choose pallet type from managed pallets
     - Loads all available pallet types from database
     - Displays pallet name and dimensions
     - Required field for calculation
   - **Height Rotation Option**: Checkbox/toggle for "Allow height rotation" (default: unchecked/false)
     - When checked, enables all 6 box orientations
     - When unchecked, only allows l×w and w×l orientations (height stays vertical)
     - Can be saved as preference per item
   - Item lookup/selector (search by Item ID, UOM, Qty)
     - When item selected, auto-fills dimensions and weight if available
   - File upload for batch processing (CSV/XLSX)
   - Display uploaded data preview
   - **Loading States**: Show spinner/loading indicator during calculation
   - Option to save dimensions with Item ID + UOM + Qty
   - Option to save height rotation preference with item

4. **Item Management** (`src/components/ItemManager.tsx`)

   - CRUD interface for items (Item ID, UOM, Qty, name, dimensions, weight)
   - **Composite Key Support**: Item ID + UOM + Qty as unique identifier
   - **Height Rotation Preference**: Checkbox to set default `allowHeightRotation` per item
     - Stored in database as `allow_height_rotation` field
     - Can be overridden per calculation in Box Input component
   - **Weight Field**: Input for box weight (required for weight calculations)
   - Search/filter by Item ID, UOM, or Qty
   - Import items from CSV/XLSX (must include Item ID, UOM, Qty, dimensions, weight, optional allowHeightRotation)
   - Link items to palletizing calculations
   - **Loading States**: Show loading indicators during CRUD operations
   - **Change History View** - Show modification history
   - Display created_by and modified_by user names
   - View change history with before/after values

5. **User Management** (`src/components/UserManager.tsx`) - Admin only

   - List all users
   - Create/edit/delete users
   - Assign roles (admin/user)
   - View user activity
   - Reset passwords

4. **Visualization** (`src/components/PalletVisualization.tsx`)

   - Three.js 3D scene showing pallet and boxes
   - **Rotation Visualization**:
     - Different colors/textures for boxes with different orientations
       - When allowHeightRotation = false: Distinguish l×w vs w×l
       - When allowHeightRotation = true: Distinguish all 6 orientations (l×w, w×l, l×h, h×l, w×h, h×w)
     - Visual indicator (arrow, label, or color) showing box orientation
     - Layer rotation indicator (show when layer is rotated 180°)
     - Display current rotation mode (height rotation enabled/disabled)
   - **View Controls**:
     - Front view, side view, top view (2D projections)
     - Layer-by-layer view (isolate single layer, step through layers)
     - 3D interactive view (rotate, zoom, pan)
   - **Interactive Features**:
     - Click on layer to highlight and show layer details
     - Toggle visibility of individual layers
     - Show/hide orientation indicators
     - Display layer rotation angle
   - **Visual Elements**:
     - Color-coded layers (different hue per layer)
     - Orientation markers on boxes (e.g., arrow showing length direction)
     - Grid overlay on pallet surface
     - Layer numbers displayed

7. **Results Display** (`src/components/ResultsPanel.tsx`)

   - **Statistics Summary**:
     - Total boxes on pallet
     - Total layers
     - Boxes per layer count
     - Utilization percentage (space)
     - **Weight Information**:
       - Total weight (boxes + pallet)
       - Max weight capacity
       - Weight utilization percentage
       - Weight-limited indicator (if arrangement limited by weight)
   - **Layer Breakdown Table**:
     - Layer number
     - Boxes per layer
     - Layer weight
     - Layer rotation (0° or 180°)
     - Orientation breakdown (count of l×w vs w×l boxes)
     - Layer dimensions and utilization
   - **Export Options**:
     - **Export PDF** - Generate and download formatted PDF report
     - **Export CSV** - Download results as CSV file
     - **Export Excel** - Download results as XLSX file
   - **Loading States**: Show loading spinner during export generation

8. **Batch Results** (`src/components/BatchResults.tsx`)

   - Grid/list of batch processing results
   - Auto-generated photos for each configuration
   - Download individual or all photos
   - **Export Options per result**:
     - Export PDF
     - Export CSV
     - Export Excel
   - **Bulk Export**: Export all results as CSV/Excel
   - **Loading States**: Show progress indicators during batch processing and photo generation

## Data Flow

### Authentication Flow

```
User Login
    ↓
Backend validates credentials
    ↓
Returns JWT token
    ↓
Frontend stores token
    ↓
All API requests include token in header
    ↓
Backend validates token on each request
```

### Palletizing Flow

```
User Input (Box Dims + Pallet Type)
    ↓
Frontend sends to /api/palletize (with auth token)
    ↓
Backend validates user, runs palletizing algorithm
    ↓
Returns: arrangement data + statistics
    ↓
Frontend renders 3D visualization + results
```

### Change Tracking Flow

```
User modifies pallet/item
    ↓
Backend processes update (with user context)
    ↓
Audit logger captures: old values, new values, user, timestamp
    ↓
Stores in change_history table
    ↓
Frontend can query /api/{resource}/:id/history
    ↓
Displays change timeline to user
```

## File Structure

```
Palletizer/
├── backend/
│   ├── src/
│   │   ├── algorithms/
│   │   │   └── palletizer.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── palletize.ts
│   │   │   ├── pallets.ts
│   │   │   ├── items.ts
│   │   │   ├── users.ts
│   │   │   ├── batch.ts
│   │   │   └── pdf.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── roleCheck.ts
│   │   ├── database/
│   │   │   ├── schema.sql
│   │   │   ├── migrations/
│   │   │   └── db.ts
│   │   ├── utils/
│   │   │   ├── fileParser.ts
│   │   │   ├── pdfGenerator.ts
│   │   │   └── auditLogger.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── ProtectedRoute.tsx
│   │   │   │   └── UserMenu.tsx
│   │   │   ├── PalletManager.tsx
│   │   │   ├── ItemManager.tsx
│   │   │   ├── UserManager.tsx
│   │   │   ├── BoxInput.tsx
│   │   │   ├── PalletVisualization.tsx
│   │   │   ├── ResultsPanel.tsx
│   │   │   ├── BatchResults.tsx
│   │   │   └── ChangeHistory.tsx
│   │   ├── contexts/
│   │   │   └── UserContext.tsx
│   │   ├── styles/
│   │   │   ├── theme.css (or tailwind.config.js)
│   │   │   └── globals.css
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── auth.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Key Algorithms

### Palletizing Algorithm (Detailed)

#### Visual Concept

```
Box Dimensions: L × W × H (height always vertical)

Allowed Rotations (horizontal plane only):
┌─────────┐         ┌─────────┐
│    L    │   →     │    W    │
│    W    │         │    L    │
└─────────┘         └─────────┘
  l×w orientation    w×l orientation
  (height = H)       (height = H)

Layer Arrangement Examples:

Layer 1 (Mixed Orientations):
┌───┐┌───┐┌───┐
│L×W││W×L││L×W│  ← Different orientations on same layer
└───┘└───┘└───┘

Layer 2 (Rotated 180° for Stability):
┌───┐┌───┐┌───┐
│W×L││L×W││W×L│  ← Rotated 180° from Layer 1
└───┘└───┘└───┘
```

### Palletizing Algorithm (Detailed)

The algorithm optimizes box placement with the following constraints and strategies:

#### Constraint: Height Rotation (Configurable)

- **Default Mode (allowHeightRotation = false)**:
  - Box height dimension is **never rotated** - boxes always sit on their base
  - Only horizontal plane rotations are allowed: `length×width` ↔ `width×length`
  - 2 orientations total

- **Extended Mode (allowHeightRotation = true)**:
  - Box height dimension **can be rotated**
  - All 6 orientations allowed: l×w×h, l×h×w, w×l×h, w×h×l, h×l×w, h×w×l
  - Algorithm optimizes across all 6 orientations
  - 6 orientations total

#### Layer Optimization Strategy

**Step 1: Try Uniform Orientations**

- If allowHeightRotation = false:
  - Calculate layer arrangement with ALL boxes in `l×w` orientation
  - Calculate layer arrangement with ALL boxes in `w×l` orientation
- If allowHeightRotation = true:
  - Calculate layer arrangement for each of 6 orientations (l×w×h, l×h×w, w×l×h, w×h×l, h×l×w, h×w×l)
- Track boxes per layer for each uniform approach

**Step 2: Try Mixed Orientations (Greedy Algorithm)**

- For each box placement position:
  - If allowHeightRotation = false:
    1. Try placing box in `l×w` orientation
    2. Try placing box in `w×l` orientation
  - If allowHeightRotation = true:
    1. Try placing box in all 6 orientations
  3. Choose orientation that fits better (or allows more future boxes)

- Continue until layer is maximally filled
- Track which boxes use which orientation

**Step 3: Select Best Layer Arrangement**

- Compare all tried orientations (2 or 6 depending on allowHeightRotation) and mixed orientations
- Select arrangement that maximizes boxes per layer

**Step 4: Stack Layers with Stability Rule**

- Stack layers up to max height
- **Stability Rule**: If layer N uses mixed orientations, layer N+1 is rotated 180° around vertical axis
- This creates interlocking pattern for pallet stability
- Track layer rotation state (0° or 180°)

#### Algorithm Implementation Details

```typescript
interface Box {
  length: number;
  width: number;
  height: number;
  weight: number; // Weight per box
  allowHeightRotation?: boolean; // Default: false - if true, height can be rotated
}

interface Pallet {
  length: number;
  width: number;
  maxHeight: number;
  maxWeight: number; // Maximum total weight capacity
  palletWeight: number; // Weight of empty pallet
}

interface BoxPlacement {
  x: number; // Position on pallet
  y: number;
  orientation: 'l×w' | 'w×l' | 'l×h' | 'h×l' | 'w×h' | 'h×w'; // Which orientation this box uses
  effectiveLength: number; // effective length based on orientation
  effectiveWidth: number; // effective width based on orientation
  effectiveHeight: number; // effective height based on orientation
}

interface Layer {
  layerNumber: number;
  rotation: 0 | 180; // Degrees around vertical axis
  boxes: BoxPlacement[];
  hasMixedOrientations: boolean; // True if layer contains both l×w and w×l
}

function palletize(box: Box, pallet: Pallet): Arrangement {
  const allowHeightRotation = box.allowHeightRotation ?? false;
  let bestArrangement: Arrangement;
  
  if (allowHeightRotation) {
    // Try all 6 orientations
    const orientations = [
      { l: box.length, w: box.width, h: box.height, name: 'l×w×h' },
      { l: box.length, w: box.height, h: box.width, name: 'l×h×w' },
      { l: box.width, w: box.length, h: box.height, name: 'w×l×h' },
      { l: box.width, w: box.height, h: box.length, name: 'w×h×l' },
      { l: box.height, w: box.length, h: box.width, name: 'h×l×w' },
      { l: box.height, w: box.width, h: box.length, name: 'h×w×l' }
    ];
    
    const uniformResults = orientations.map(orient => 
      calculateLayer(orient.l, orient.w, pallet, orient.name)
    );
    
    const mixed = calculateMixedLayer(box, pallet, true);
    const bestLayer = selectBest(...uniformResults, mixed);
    bestArrangement = stackLayers(bestLayer, box.height, pallet.maxHeight);
  } else {
    // Original 2-orientation logic
    const uniformLW = calculateLayer(box.length, box.width, pallet, 'uniform-lw');
    const uniformWL = calculateLayer(box.width, box.length, pallet, 'uniform-wl');
    const mixed = calculateMixedLayer(box, pallet, false);
    const bestLayer = selectBest(uniformLW, uniformWL, mixed);
    bestArrangement = stackLayers(bestLayer, box.height, pallet.maxHeight);
  }
  
  // Apply weight constraints
  return applyWeightConstraints(bestArrangement, box.weight, pallet);
}

function applyWeightConstraints(
  arrangement: Arrangement, 
  boxWeight: number, 
  pallet: Pallet
): Arrangement {
  const totalWeight = (arrangement.totalBoxes * boxWeight) + pallet.palletWeight;
  
  if (totalWeight <= pallet.maxWeight) {
    // Within weight limit, return as-is
    arrangement.totalWeight = totalWeight;
    arrangement.weightUtilization = (totalWeight / pallet.maxWeight) * 100;
    arrangement.weightLimited = false;
    return arrangement;
  }
  
  // Exceeds weight limit, reduce layers/boxes
  const maxBoxWeight = pallet.maxWeight - pallet.palletWeight;
  const maxBoxes = Math.floor(maxBoxWeight / boxWeight);
  
  // Reduce layers to fit within weight constraint
  let currentBoxes = 0;
  const adjustedLayers: Layer[] = [];
  
  for (const layer of arrangement.layers) {
    if (currentBoxes + layer.boxes.length <= maxBoxes) {
      adjustedLayers.push(layer);
      currentBoxes += layer.boxes.length;
    } else {
      // Partially fill last layer if possible
      const remainingBoxes = maxBoxes - currentBoxes;
      if (remainingBoxes > 0) {
        adjustedLayers.push({
          ...layer,
          boxes: layer.boxes.slice(0, remainingBoxes)
        });
      }
      break;
    }
  }
  
  const finalWeight = (currentBoxes * boxWeight) + pallet.palletWeight;
  return {
    ...arrangement,
    layers: adjustedLayers,
    totalBoxes: currentBoxes,
    totalLayers: adjustedLayers.length,
    boxesPerLayer: adjustedLayers.map(l => l.boxes.length),
    totalWeight: finalWeight,
    weightUtilization: (finalWeight / pallet.maxWeight) * 100,
    weightLimited: true
  };
}

function calculateMixedLayer(box: Box, pallet: Pallet, allowHeightRotation: boolean): Layer {
  // 2D bin-packing algorithm (Bottom-Left-Fill or First-Fit-Decreasing)
  // For each box placement:
  //   If allowHeightRotation = false:
  //     1. Try placing with l×w orientation
  //     2. Try placing with w×l orientation
  //   If allowHeightRotation = true:
  //     1. Try placing with all 6 orientations
  //   3. Choose orientation that fits better or allows more future placements
  // Continue until layer cannot fit more boxes
}

function stackLayers(
  layerTemplate: Layer, 
  boxHeight: number, 
  maxHeight: number
): Arrangement {
  let currentHeight = 0;
  let layerNumber = 1;
  let previousHadMixed = false;
  const layers: Layer[] = [];
  
  while (currentHeight + boxHeight <= maxHeight) {
    const layer: Layer = {
      ...layerTemplate,
      layerNumber,
      rotation: previousHadMixed ? 180 : 0
    };
    
    // Apply rotation to box positions if needed
    if (layer.rotation === 180) {
      layer.boxes = rotateLayer180(layer.boxes, pallet);
    }
    
    layers.push(layer);
    currentHeight += boxHeight;
    layerNumber++;
    previousHadMixed = layer.hasMixedOrientations;
  }
  
  return { layers, totalBoxes: sum(layers.map(l => l.boxes.length)) };
}
```

#### Visualization Requirements

- **Orientation Indicators**: Visual distinction between `l×w` and `w×l` boxes
  - Different colors or textures
  - Arrow/label showing length direction
- **Layer Rotation**: Visual indicator when layer is rotated 180°
  - Different border/outline
  - Rotation angle displayed
- **Layer-by-Layer View**: Step through layers to see arrangement progression

## Implementation Todos

1. **Setup project structure** - Initialize React and Node.js projects with TypeScript
2. **Setup database** - Create SQLite database with:

   - Users table (authentication)
   - Pallets table (with max_weight, pallet_weight, created_by, modified_by)
   - Items table (composite key: item_id, uom, qty with weight, created_by, modified_by)
   - Change_history table (audit trail)

3. **Implement authentication system** - JWT-based auth with:

   - Login/logout endpoints
   - Password hashing (bcrypt)
   - Protected routes middleware
   - User context in frontend
   - Session management

4. **Implement change tracking** - Audit logging system:

   - Automatic logging on all CRUD operations
   - Store old/new values
   - Track user and timestamp
   - Change history API endpoints

5. **Implement palletizing algorithm** - Core bin-packing logic with:

   - Configurable height rotation option (default: false, height stays vertical)
   - When height rotation disabled: Two orientation options (l×w, w×l) per box
   - When height rotation enabled: Six orientation options (all combinations)
   - Mixed orientation support within layers
   - 180° layer rotation for stability when mixed orientations used
   - 2D bin-packing algorithm (Bottom-Left-Fill or similar)
   - **Weight constraint handling**: Reduce layers/boxes if total weight exceeds pallet max_weight
   - Calculate weight utilization and flag weight-limited arrangements

6. **Setup UI theme** - Configure dark mode by default:

   - Set up dark color scheme (backgrounds, text, borders, accents)
   - Apply dark theme to all components
   - Configure Three.js scene with dark background
   - Ensure good contrast for accessibility
   - Style all UI elements consistently

7. **Create backend API** - Express routes for:

   - Authentication (login, logout, register)
   - Palletize calculations
   - Pallets CRUD (with change tracking)
   - Items CRUD (with composite key: Item ID + UOM + Qty, change tracking)
   - Users management (admin only)
   - Change history endpoints
   - Batch processing, PDF export

8. **Build authentication UI** - Login page (dark themed), protected routes, user menu
9. **Build pallet management UI** - CRUD interface (dark themed) with:
    - Weight fields (max_weight, pallet_weight)
    - Change history display
    - Loading states during operations
10. **Build item management UI** - CRUD interface (dark themed) with:

   - Composite key support (Item ID + UOM + Qty)
   - Weight field input
   - Height rotation preference checkbox (default: false)
   - Change history display
   - Search/filter by Item ID, UOM, or Qty
   - Loading states during operations

11. **Build user management UI** - Admin interface (dark themed) for user management
12. **Build box input component** - Manual entry (dark themed), Item lookup (Item ID + UOM + Qty), file upload
    - **Add pallet type dropdown** - Select from managed pallet types (required)
    - Add weight input field
    - Add "Allow height rotation" checkbox/toggle (default: unchecked)
    - Load height rotation preference from item if selected
    - Auto-fill weight from item if selected
    - Pass allowHeightRotation, palletId, and weight to palletize API
    - Show loading state during calculation
13. **Implement 3D visualization** - Three.js scene with:

   - Dark background and lighting
   - Dark-themed UI controls and overlays

   - Orientation indicators (visual distinction for l×w vs w×l boxes, or all 6 when height rotation enabled)
   - Layer rotation visualization (180° rotation indicators)
   - Display current rotation mode (height rotation enabled/disabled indicator)
   - Multiple view modes (front, side, top, layer-by-layer)
   - Interactive controls for examining arrangements

14. **Create results display** - Statistics and layer breakdown (dark themed) with:
    - Weight information display (total weight, max weight, utilization, weight-limited indicator)
    - Export buttons: PDF, CSV, Excel
    - Loading states during export generation
15. **Add batch processing** - CSV/XLSX parsing (must include Item ID, UOM, Qty, dimensions, weight) and multiple calculations
    - Progress indicators during batch processing
    - Loading states for each calculation
16. **Implement photo generation** - Auto-create images for batch results (dark themed UI)
17. **Implement export generation** - Create formatted reports:
    - PDF reports with layout diagrams, statistics, and weight information
    - CSV export with all results data
    - Excel/XLSX export with multiple sheets (summary, layer breakdown)
    - Include weight calculations in all export formats
18. **Add file download** - Export batch photos as ZIP, individual PDF downloads
19. **Build change history component** - Display audit trail (dark themed) with before/after values, user info, timestamps
20. **Implement loading states** - Add loading indicators throughout UI:
    - Spinners for API calls
    - Progress bars for batch operations
    - Button disabled states during actions
    - Skeleton loaders for data tables
    - Toast notifications for user feedback
21. **Implement export formats** - CSV and Excel export functionality:
    - CSV export with all results data
    - Excel export with formatted sheets
    - Include weight information in exports
    - Loading states during export generation