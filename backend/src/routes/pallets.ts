import express from 'express';
import { dbGet, dbAll, dbRun } from '../database/db';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { logChange, getChangedFields } from '../utils/auditLogger';
import { Pallet } from '../types';

const router = express.Router();

// Helper function to calculate max dimensions from overhang
function calculateMaxDimensions(pallet: any): Pallet {
  const overhang = pallet.max_overhang || 0;
  return {
    ...pallet,
    max_length: pallet.length + (2 * overhang),
    max_width: pallet.width + (2 * overhang),
  };
}

// Get all pallets
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const pallets = await dbAll('SELECT * FROM pallets ORDER BY name');
    // Calculate max_length and max_width from overhang for each pallet
    const palletsWithMax = pallets.map(calculateMaxDimensions);
    res.json(palletsWithMax);
  } catch (error) {
    console.error('Get pallets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pallet by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const pallet = await dbGet('SELECT * FROM pallets WHERE id = ?', [req.params.id]);
    if (!pallet) {
      return res.status(404).json({ error: 'Pallet not found' });
    }
    res.json(calculateMaxDimensions(pallet));
  } catch (error) {
    console.error('Get pallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get change history for pallet
router.get('/:id/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const history = await dbAll(
      'SELECT ch.*, u.username FROM change_history ch LEFT JOIN users u ON ch.user_id = u.id WHERE ch.table_name = ? AND ch.record_id = ? ORDER BY ch.timestamp DESC',
      ['pallets', req.params.id]
    );
    res.json(history);
  } catch (error) {
    console.error('Get pallet history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create pallet
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const pallet: Pallet = req.body;
    const maxOverhang = pallet.max_overhang || 0;
    
    // Check if old max_length/max_width columns exist
    const columns = await dbAll("PRAGMA table_info(pallets)");
    const columnNames = columns.map((col: any) => col.name);
    const hasMaxLength = columnNames.includes('max_length');
    const hasMaxWidth = columnNames.includes('max_width');
    
    // Calculate max dimensions for backward compatibility if old columns exist
    const maxLength = pallet.length + (2 * maxOverhang);
    const maxWidth = pallet.width + (2 * maxOverhang);
    
    // Build INSERT statement dynamically based on existing columns
    let insertFields = 'name, length, width, height, max_overhang, max_height, max_weight, pallet_weight, created_by, modified_by';
    let insertValues = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
    let insertParams: any[] = [
      pallet.name,
      pallet.length,
      pallet.width,
      pallet.height,
      maxOverhang,
      pallet.max_height,
      pallet.max_weight || null,
      pallet.pallet_weight || 0,
      req.user!.id,
      req.user!.id,
    ];
    
    // Add old columns if they exist (for backward compatibility)
    if (hasMaxLength) {
      insertFields += ', max_length';
      insertValues += ', ?';
      insertParams.push(maxLength);
    }
    if (hasMaxWidth) {
      insertFields += ', max_width';
      insertValues += ', ?';
      insertParams.push(maxWidth);
    }
    
    const result = await dbRun(
      `INSERT INTO pallets (${insertFields})
       VALUES (${insertValues})`,
      insertParams
    );

    const newPallet = await dbGet('SELECT * FROM pallets WHERE id = ?', [result.lastID]);
    const palletWithMax = calculateMaxDimensions(newPallet);
    await logChange('pallets', result.lastID.toString(), 'CREATE', req.user!, undefined, palletWithMax, undefined, req.ip);

    res.status(201).json(palletWithMax);
  } catch (error) {
    console.error('Create pallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update pallet
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existingPalletRaw = await dbGet('SELECT * FROM pallets WHERE id = ?', [req.params.id]);
    if (!existingPalletRaw) {
      return res.status(404).json({ error: 'Pallet not found' });
    }
    const existingPallet = calculateMaxDimensions(existingPalletRaw);

    const pallet: Pallet = req.body;
    const maxOverhang = pallet.max_overhang !== undefined ? pallet.max_overhang : (existingPalletRaw as any).max_overhang || 0;
    
    // Check if old max_length/max_width columns exist
    const columns = await dbAll("PRAGMA table_info(pallets)");
    const columnNames = columns.map((col: any) => col.name);
    const hasMaxLength = columnNames.includes('max_length');
    const hasMaxWidth = columnNames.includes('max_width');
    
    // Calculate max dimensions for backward compatibility if old columns exist
    const maxLength = pallet.length + (2 * maxOverhang);
    const maxWidth = pallet.width + (2 * maxOverhang);
    
    // Build UPDATE statement dynamically
    let updateFields = `name = ?, length = ?, width = ?, height = ?, 
       max_overhang = ?, max_height = ?, 
       max_weight = ?, pallet_weight = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP`;
    let updateParams: any[] = [
      pallet.name,
      pallet.length,
      pallet.width,
      pallet.height,
      maxOverhang,
      pallet.max_height,
      pallet.max_weight || null,
      pallet.pallet_weight || 0,
      req.user!.id,
    ];
    
    // Add old columns if they exist
    if (hasMaxLength) {
      updateFields += ', max_length = ?';
      updateParams.push(maxLength);
    }
    if (hasMaxWidth) {
      updateFields += ', max_width = ?';
      updateParams.push(maxWidth);
    }
    
    updateParams.push(req.params.id);
    
    await dbRun(
      `UPDATE pallets SET ${updateFields} WHERE id = ?`,
      updateParams
    );

    const updatedPalletRaw = await dbGet('SELECT * FROM pallets WHERE id = ?', [req.params.id]);
    const updatedPallet = calculateMaxDimensions(updatedPalletRaw);
    const changedFields = getChangedFields(existingPallet, updatedPallet);
    await logChange('pallets', req.params.id, 'UPDATE', req.user!, existingPallet, updatedPallet, changedFields, req.ip);

    res.json(updatedPallet);
  } catch (error) {
    console.error('Update pallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete pallet
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const pallet = await dbGet('SELECT * FROM pallets WHERE id = ?', [req.params.id]);
    if (!pallet) {
      return res.status(404).json({ error: 'Pallet not found' });
    }

    await dbRun('DELETE FROM pallets WHERE id = ?', [req.params.id]);
    await logChange('pallets', req.params.id, 'DELETE', req.user!, pallet, undefined, undefined, req.ip);

    res.json({ message: 'Pallet deleted successfully' });
  } catch (error) {
    console.error('Delete pallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
