-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    must_change_password BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Pallets table
CREATE TABLE IF NOT EXISTS pallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    length REAL NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    max_overhang REAL DEFAULT 0,
    max_height REAL NOT NULL,
    max_weight REAL,
    pallet_weight REAL DEFAULT 0,
    created_by INTEGER,
    modified_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (modified_by) REFERENCES users(id)
);

-- Items table (composite key: item_id, uom, qty)
CREATE TABLE IF NOT EXISTS items (
    item_id TEXT NOT NULL,
    uom TEXT NOT NULL,
    qty REAL NOT NULL,
    name TEXT,
    length REAL NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    weight REAL NOT NULL,
    description TEXT,
    allow_height_rotation BOOLEAN DEFAULT 0,
    allow_overhang BOOLEAN DEFAULT 1,
    created_by INTEGER,
    modified_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, uom, qty),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (modified_by) REFERENCES users(id)
);

-- Change history table (audit trail)
CREATE TABLE IF NOT EXISTS change_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE')),
    user_id INTEGER NOT NULL,
    old_values TEXT,
    new_values TEXT,
    changed_fields TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_change_history_table_record ON change_history(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_change_history_user ON change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_change_history_timestamp ON change_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_items_item_id ON items(item_id);
CREATE INDEX IF NOT EXISTS idx_pallets_name ON pallets(name);
