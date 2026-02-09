import express from 'express';
import { dbGet } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generatePDF } from '../utils/pdfGenerator';
import { Pallet, Box } from '../types';

const router = express.Router();

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { arrangement, palletId, box, itemInfo, images } = req.body;

    console.log('PDF export request received');
    console.log('Has images:', images ? 'yes' : 'no');
    if (images) {
      console.log('Image keys:', Object.keys(images));
      console.log('Image data lengths:', {
        view3d: images.view3d?.length || 0,
        front: images.front?.length || 0,
        side: images.side?.length || 0,
        layer: images.layer?.length || 0
      });
    }

    if (!arrangement || !palletId || !box) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const pallet = await dbGet('SELECT * FROM pallets WHERE id = ?', [palletId]) as Pallet | undefined;
    if (!pallet) {
      return res.status(404).json({ error: 'Pallet not found' });
    }

    // Set headers before creating PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="palletizing-report-${Date.now()}.pdf"`);

    const doc = generatePDF(arrangement, pallet, box, itemInfo, images);

    // Handle errors during PDF generation
    doc.on('error', (error) => {
      console.error('PDF stream error:', error);
      console.error('Error stack:', error.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: 'PDF generation failed: ' + error.message });
      } else {
        res.end();
      }
    });

    // Handle response errors
    res.on('error', (error) => {
      console.error('Response error:', error);
      doc.destroy();
    });

    // Handle PDF document errors
    doc.on('end', () => {
      console.log('PDF generation completed successfully');
    });

    // Pipe PDF to response
    doc.pipe(res);
    doc.end();
  } catch (error: any) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

export default router;
