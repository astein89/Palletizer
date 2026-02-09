import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { dbGet } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { palletize } from '../algorithms/palletizer';
import { Pallet, Box, Arrangement } from '../types';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

interface BatchRow {
  item_id?: string;
  uom?: string;
  qty?: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  pallet_id?: number;
  allow_height_rotation?: boolean;
}

router.post('/', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
    let rows: BatchRow[] = [];

    // Parse file based on extension
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(worksheet);
    } else if (fileExtension === 'csv') {
      const fs = require('fs');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      rows = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Use CSV or XLSX' });
    }

    // Validate required columns
    const requiredColumns = ['length', 'width', 'height', 'weight'];
    const firstRow = rows[0];
    if (!firstRow) {
      return res.status(400).json({ error: 'File is empty' });
    }

    for (const col of requiredColumns) {
      if (!(col in firstRow)) {
        return res.status(400).json({ error: `Missing required column: ${col}` });
      }
    }

    // Process each row
    const results: Array<{
      row: number;
      input: BatchRow;
      arrangement: Arrangement | null;
      error?: string;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const box: Box = {
          length: Number(row.length),
          width: Number(row.width),
          height: Number(row.height),
          weight: Number(row.weight),
          allowHeightRotation: row.allow_height_rotation === true || row.allow_height_rotation === 'true' || row.allow_height_rotation === 1 || row.allow_height_rotation === '1',
          allowOverhang: row.allow_overhang !== undefined 
            ? (row.allow_overhang === true || row.allow_overhang === 'true' || row.allow_overhang === 1 || row.allow_overhang === '1')
            : true, // Default to true if not specified
        };

        // Get pallet (use provided pallet_id or default to first pallet)
        let palletId = row.pallet_id ? Number(row.pallet_id) : null;
        if (!palletId) {
          const firstPallet = await dbGet('SELECT * FROM pallets LIMIT 1') as Pallet | undefined;
          if (!firstPallet) {
            results.push({
              row: i + 1,
              input: row,
              arrangement: null,
              error: 'No pallet found. Please create a pallet first or specify pallet_id in file.',
            });
            continue;
          }
          palletId = firstPallet.id!;
        }

        const pallet = await dbGet('SELECT * FROM pallets WHERE id = ?', [palletId]) as Pallet | undefined;
        if (!pallet) {
          results.push({
            row: i + 1,
            input: row,
            arrangement: null,
            error: `Pallet with ID ${palletId} not found`,
          });
          continue;
        }

        const arrangement = palletize(box, pallet);
        results.push({
          row: i + 1,
          input: row,
          arrangement,
        });
      } catch (error: any) {
        results.push({
          row: i + 1,
          input: row,
          arrangement: null,
          error: error.message || 'Processing error',
        });
      }
    }

    // Generate photos for successful results (optional - can be done client-side)
    // For now, we'll return the results and let the frontend handle visualization

    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(filePath);

    res.json({ 
      results, 
      total: results.length, 
      successful: results.filter(r => r.arrangement).length,
      // Note: Photo generation can be done client-side using the 3D visualization component
    });
  } catch (error: any) {
    console.error('Batch processing error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
