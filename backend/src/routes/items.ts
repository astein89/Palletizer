import express from 'express';
import { dbGet, dbAll, dbRun } from '../database/db';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { logChange, getChangedFields } from '../utils/auditLogger';
import { Item } from '../types';

const router = express.Router();

// Get all items
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const items = await dbAll('SELECT * FROM items ORDER BY item_id, uom, qty');
    res.json(items);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get item by composite key
router.get('/:itemId/:uom/:qty', authenticate, async (req: AuthRequest, res) => {
  try {
    const item = await dbGet(
      'SELECT * FROM items WHERE item_id = ? AND uom = ? AND qty = ?',
      [req.params.itemId, req.params.uom, req.params.qty]
    );
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get change history for item
router.get('/:itemId/:uom/:qty/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const recordId = `${req.params.itemId}|${req.params.uom}|${req.params.qty}`;
    const history = await dbAll(
      'SELECT ch.*, u.username FROM change_history ch LEFT JOIN users u ON ch.user_id = u.id WHERE ch.table_name = ? AND ch.record_id = ? ORDER BY ch.timestamp DESC',
      ['items', recordId]
    );
    res.json(history);
  } catch (error) {
    console.error('Get item history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/update item
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const item: Item = req.body;
    const recordId = `${item.item_id}|${item.uom}|${item.qty}`;

    // Check if item exists
    const existingItem = await dbGet(
      'SELECT * FROM items WHERE item_id = ? AND uom = ? AND qty = ?',
      [item.item_id, item.uom, item.qty]
    ) as Item | undefined;

    if (existingItem) {
      // Update existing item
      await dbRun(
        `UPDATE items SET 
         name = ?, length = ?, width = ?, height = ?, weight = ?, 
         description = ?, allow_height_rotation = ?, allow_overhang = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE item_id = ? AND uom = ? AND qty = ?`,
        [
          item.name || null,
          item.length,
          item.width,
          item.height,
          item.weight,
          item.description || null,
          item.allow_height_rotation ? 1 : 0,
          item.allow_overhang !== undefined ? (item.allow_overhang ? 1 : 0) : 1,
          req.user!.id,
          item.item_id,
          item.uom,
          item.qty,
        ]
      );

      const updatedItem = await dbGet(
        'SELECT * FROM items WHERE item_id = ? AND uom = ? AND qty = ?',
        [item.item_id, item.uom, item.qty]
      );
      const changedFields = getChangedFields(existingItem, updatedItem);
      await logChange('items', recordId, 'UPDATE', req.user!, existingItem, updatedItem, changedFields, req.ip);

      res.json(updatedItem);
    } else {
      // Create new item
      await dbRun(
        `INSERT INTO items (item_id, uom, qty, name, length, width, height, weight, description, allow_height_rotation, allow_overhang, created_by, modified_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.item_id,
          item.uom,
          item.qty,
          item.name || null,
          item.length,
          item.width,
          item.height,
          item.weight,
          item.description || null,
          item.allow_height_rotation ? 1 : 0,
          item.allow_overhang !== undefined ? (item.allow_overhang ? 1 : 0) : 1,
          req.user!.id,
          req.user!.id,
        ]
      );

      const newItem = await dbGet(
        'SELECT * FROM items WHERE item_id = ? AND uom = ? AND qty = ?',
        [item.item_id, item.uom, item.qty]
      );
      await logChange('items', recordId, 'CREATE', req.user!, undefined, newItem, undefined, req.ip);

      res.status(201).json(newItem);
    }
  } catch (error) {
    console.error('Create/update item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item
router.put('/:itemId/:uom/:qty', authenticate, async (req: AuthRequest, res) => {
  try {
    const existingItem = await dbGet(
      'SELECT * FROM items WHERE item_id = ? AND uom = ? AND qty = ?',
      [req.params.itemId, req.params.uom, req.params.qty]
    ) as Item | undefined;

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item: Item = req.body;
    await dbRun(
      `UPDATE items SET 
       name = ?, length = ?, width = ?, height = ?, weight = ?, 
       description = ?, allow_height_rotation = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE item_id = ? AND uom = ? AND qty = ?`,
      [
        item.name || null,
        item.length,
        item.width,
        item.height,
        item.weight,
        item.description || null,
        item.allow_height_rotation ? 1 : 0,
        req.user!.id,
        req.params.itemId,
        req.params.uom,
        req.params.qty,
      ]
    );

    const updatedItem = await dbGet(
      'SELECT * FROM items WHERE item_id = ? AND uom = ? AND qty = ?',
      [req.params.itemId, req.params.uom, req.params.qty]
    );
    const recordId = `${req.params.itemId}|${req.params.uom}|${req.params.qty}`;
    const changedFields = getChangedFields(existingItem, updatedItem);
    await logChange('items', recordId, 'UPDATE', req.user!, existingItem, updatedItem, changedFields, req.ip);

    res.json(updatedItem);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete item
router.delete('/:itemId/:uom/:qty', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const item = await dbGet(
      'SELECT * FROM items WHERE item_id = ? AND uom = ? AND qty = ?',
      [req.params.itemId, req.params.uom, req.params.qty]
    );

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await dbRun(
      'DELETE FROM items WHERE item_id = ? AND uom = ? AND qty = ?',
      [req.params.itemId, req.params.uom, req.params.qty]
    );

    const recordId = `${req.params.itemId}|${req.params.uom}|${req.params.qty}`;
    await logChange('items', recordId, 'DELETE', req.user!, item, undefined, undefined, req.ip);

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
