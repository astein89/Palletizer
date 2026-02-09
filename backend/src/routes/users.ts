import express from 'express';
import bcrypt from 'bcrypt';
import { dbGet, dbAll, dbRun } from '../database/db';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { logChange, getChangedFields } from '../utils/auditLogger';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await dbAll('SELECT id, username, email, role, must_change_password, created_at, last_login FROM users ORDER BY username');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Case-insensitive username check
    const existingUser = await dbGet('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await dbRun(
      'INSERT INTO users (username, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, ?)',
      [username, email || null, hashedPassword, role, 1] // New users must change password
    );

    const newUser = await dbGet('SELECT id, username, email, role, must_change_password FROM users WHERE id = ?', [result.lastID]);
    await logChange('users', result.lastID.toString(), 'CREATE', req.user!, undefined, newUser, undefined, req.ip);

    res.status(201).json({ user: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const existingUser = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]) as any;
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { username, email, role, password, must_change_password } = req.body;
    const updates: any = {};

    if (username !== undefined) {
      // Check if new username (case-insensitive) conflicts with existing user
      const conflictingUser = await dbGet(
        'SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?',
        [username, req.params.id]
      );
      if (conflictingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      updates.username = username;
    }
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (must_change_password !== undefined) updates.must_change_password = must_change_password ? 1 : 0;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updates.password_hash = await bcrypt.hash(password, 10);
      // When admin resets password, user must change it
      updates.must_change_password = 1;
    }

    const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const updateValues = Object.values(updates);

    if (updateFields) {
      await dbRun(
        `UPDATE users SET ${updateFields} WHERE id = ?`,
        [...updateValues, req.params.id]
      );
    }

    const updatedUser = await dbGet('SELECT id, username, email, role, must_change_password FROM users WHERE id = ?', [req.params.id]);
    const changedFields = getChangedFields(existingUser, updatedUser);
    await logChange('users', req.params.id, 'UPDATE', req.user!, existingUser, updatedUser, changedFields, req.ip);

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (parseInt(req.params.id) === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    await logChange('users', req.params.id, 'DELETE', req.user!, user, undefined, undefined, req.ip);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
