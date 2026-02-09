import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { readFileSync } from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/palletizer.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Promisify database methods
export const dbGet = promisify(db.get.bind(db));
export const dbAll = promisify(db.all.bind(db));
export const dbExec = promisify(db.exec.bind(db));

// Custom dbRun that returns lastID
export function dbRun(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params || [], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// Initialize database with schema
async function initializeDatabase() {
  try {
    // Check if tables exist
    const tables = await dbAll(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'pallets', 'items', 'change_history')"
    );
    
    // If tables don't exist, create them
    if (!tables || tables.length < 4) {
      console.log('Creating database schema...');
      const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
      // Split by semicolon and execute each statement
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await dbRun(statement);
          } catch (stmtError: any) {
            // Ignore "already exists" errors
            if (!stmtError.message?.includes('already exists')) {
              console.warn('Statement warning:', stmtError.message);
            }
          }
        }
      }
      console.log('Database schema initialized');
    } else {
      console.log('Database schema already exists');
    }
    
    // Migrate existing pallets: handle max_overhang and old max_length/max_width columns
    try {
      const columns = await dbAll("PRAGMA table_info(pallets)");
      const columnNames = columns.map((col: any) => col.name);
      const hasOverhang = columnNames.includes('max_overhang');
      const hasMaxLength = columnNames.includes('max_length');
      const hasMaxWidth = columnNames.includes('max_width');
      
      if (!hasOverhang) {
        // Add max_overhang column
        await dbRun('ALTER TABLE pallets ADD COLUMN max_overhang REAL DEFAULT 0');
        console.log('Added max_overhang column to pallets table');
        
        // Migrate existing data: calculate overhang from max_length/max_width
        if (hasMaxLength || hasMaxWidth) {
          await dbRun(`
            UPDATE pallets 
            SET max_overhang = CASE 
              WHEN max_length > length THEN (max_length - length) / 2
              WHEN max_width > width THEN (max_width - width) / 2
              ELSE 0
            END
            WHERE max_overhang = 0 OR max_overhang IS NULL
          `);
          console.log('Migrated existing pallet data to use max_overhang');
        }
      }
      
      // Handle old max_length and max_width columns - make them nullable if they exist
      // SQLite doesn't support DROP COLUMN easily, so we'll just ensure they're nullable
      // by recreating them if needed (but we won't use them in INSERT/UPDATE)
      if (hasMaxLength || hasMaxWidth) {
        console.log('Note: Old max_length/max_width columns detected. They will be ignored in favor of max_overhang.');
        // Try to make them nullable by updating any NULL values to 0 first
        try {
          if (hasMaxLength) {
            await dbRun('UPDATE pallets SET max_length = 0 WHERE max_length IS NULL');
          }
          if (hasMaxWidth) {
            await dbRun('UPDATE pallets SET max_width = 0 WHERE max_width IS NULL');
          }
        } catch (updateError: any) {
          console.warn('Could not update old columns:', updateError.message);
        }
      }
    } catch (migrationError: any) {
      // Column might already exist, ignore
      if (!migrationError.message?.includes('duplicate column')) {
        console.warn('Migration warning:', migrationError.message);
      }
    }
    
    // Migrate existing users: add must_change_password if column doesn't exist
    try {
      const columns = await dbAll("PRAGMA table_info(users)");
      const hasMustChangePassword = columns.some((col: any) => col.name === 'must_change_password');
      
      if (!hasMustChangePassword) {
        await dbRun('ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 1');
        console.log('Added must_change_password column to users table');
      }
    } catch (migrationError: any) {
      if (!migrationError.message?.includes('duplicate column')) {
        console.warn('Migration warning:', migrationError.message);
      }
    }
    
    // Migrate existing items: add allow_overhang if column doesn't exist
    try {
      const columns = await dbAll("PRAGMA table_info(items)");
      const hasAllowOverhang = columns.some((col: any) => col.name === 'allow_overhang');
      
      if (!hasAllowOverhang) {
        await dbRun('ALTER TABLE items ADD COLUMN allow_overhang BOOLEAN DEFAULT 1');
        console.log('Added allow_overhang column to items table');
      }
    } catch (migrationError: any) {
      if (!migrationError.message?.includes('duplicate column')) {
        console.warn('Migration warning:', migrationError.message);
      }
    }
    
    // Create default admin user if no users exist
    const users = await dbAll('SELECT COUNT(*) as count FROM users');
    if ((users[0] as any).count === 0) {
      const bcrypt = require('bcrypt');
      const defaultPassword = await bcrypt.hash('admin', 10);
      await dbRun(
        'INSERT INTO users (username, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, ?)',
        ['admin', 'admin@palletizer.com', defaultPassword, 'admin', 1]
      );
      console.log('Default admin user created (username: admin, password: admin)');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

export default db;
