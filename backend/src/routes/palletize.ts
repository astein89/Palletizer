import express from 'express';
import { dbGet } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { palletize } from '../algorithms/palletizer';
import { Box, Pallet, PalletRequest } from '../types';

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

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const request: PalletRequest = req.body;
    const { palletId, box } = request;

    if (!palletId || !box) {
      return res.status(400).json({ error: 'Pallet ID and box dimensions required' });
    }

    // Get pallet from database
    const palletDataRaw = await dbGet('SELECT * FROM pallets WHERE id = ?', [palletId]) as Pallet | undefined;
    if (!palletDataRaw) {
      return res.status(404).json({ error: 'Pallet not found' });
    }

    // Calculate max_length and max_width from overhang
    const palletData = calculateMaxDimensions(palletDataRaw);

    // Validate box dimensions
    if (!box.length || !box.width || !box.height || !box.weight) {
      return res.status(400).json({ error: 'Box dimensions and weight required' });
    }

    // Run palletizing algorithm
    const arrangement = palletize(box, palletData);

    res.json(arrangement);
  } catch (error) {
    console.error('Palletize error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
