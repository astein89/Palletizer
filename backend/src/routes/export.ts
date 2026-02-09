import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateCSV } from '../utils/csvExporter';
import { generateExcel } from '../utils/excelExporter';
import { Arrangement, Pallet, Box } from '../types';

const router = express.Router();

router.post('/csv', authenticate, async (req: AuthRequest, res) => {
  try {
    const { arrangement, pallet, box, itemInfo } = req.body;

    if (!arrangement || !pallet || !box) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const csv = generateCSV(arrangement, pallet, box, itemInfo);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="palletizing-report-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/excel', authenticate, async (req: AuthRequest, res) => {
  try {
    const { arrangement, pallet, box, itemInfo } = req.body;

    if (!arrangement || !pallet || !box) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const buffer = generateExcel(arrangement, pallet, box, itemInfo);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="palletizing-report-${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
