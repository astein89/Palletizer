import PDFDocument from 'pdfkit';
import { Arrangement, Pallet, Box } from '../types';

export function generatePDF(
  arrangement: Arrangement,
  pallet: Pallet,
  box: Box,
  itemInfo?: { item_id?: string; uom?: string; qty?: number; name?: string },
  images?: { view3d?: string; front?: string; side?: string; layer?: string } | null
): PDFDocument {
  const doc = new PDFDocument({ margin: 50 });

  // Header
  doc.fontSize(20).text('Palletizing Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  // Pallet Information
  doc.fontSize(16).text('Pallet Information', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Name: ${pallet.name}`);
  doc.text(`Dimensions: ${pallet.length} × ${pallet.width} × ${pallet.height} in`);
  doc.text(`Max Dimensions: ${pallet.max_length || pallet.length} × ${pallet.max_width || pallet.width} × ${pallet.max_height} in`);
  if (pallet.max_overhang) {
    doc.text(`Max Overhang: ${pallet.max_overhang} in`);
  }
  if (pallet.max_weight) {
    doc.text(`Max Weight: ${pallet.max_weight} lbs (Pallet Weight: ${pallet.pallet_weight || 0} lbs)`);
  }
  doc.moveDown();

  // Box/Item Information
  doc.fontSize(16).text('Box/Item Information', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  if (itemInfo?.item_id) {
    doc.text(`Item ID: ${itemInfo.item_id}`);
    doc.text(`UOM: ${itemInfo.uom || 'N/A'}`);
    doc.text(`Qty: ${itemInfo.qty || 'N/A'}`);
    if (itemInfo.name) doc.text(`Name: ${itemInfo.name}`);
  }
  doc.text(`Dimensions: ${box.length} × ${box.width} × ${box.height} in`);
  doc.text(`Weight: ${box.weight} lbs`);
  doc.text(`Height Rotation Allowed: ${arrangement.allowHeightRotation ? 'Yes' : 'No'}`);
  doc.text(`Overhang Allowed: ${box.allowOverhang !== false ? 'Yes' : 'No'}`);
  doc.moveDown();

  // Statistics
  doc.fontSize(16).text('Statistics', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Total Boxes: ${arrangement.totalBoxes}`);
  doc.text(`Total Layers: ${arrangement.totalLayers}`);
  doc.text(`Boxes per Layer (Layer 1): ${arrangement.boxesPerLayer[0] || 0}`);
  doc.text(`Total Weight: ${arrangement.totalWeight.toFixed(2)} lbs`);
  if (pallet.max_weight) {
    doc.text(`Weight Utilization: ${arrangement.weightUtilization.toFixed(1)}%`);
    if (arrangement.weightLimited) {
      doc.text('⚠️ Arrangement limited by weight capacity', { color: 'red' });
    }
  }
  doc.moveDown();

  // Layer Breakdown
  doc.fontSize(16).text('Layer Breakdown', { underline: true });
  doc.moveDown(0.5);
  
  let tableTop = doc.y;
  const rowHeight = 20;
  const colWidths = [60, 80, 80, 100];
  
  // Table header
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Layer', 50, tableTop);
  doc.text('Boxes', 50 + colWidths[0], tableTop);
  doc.text('Rotation', 50 + colWidths[0] + colWidths[1], tableTop);
  doc.text('Weight', 50 + colWidths[0] + colWidths[1] + colWidths[2], tableTop);
  
  tableTop += rowHeight;
  doc.font('Helvetica');
  
  // Table rows
  arrangement.layers.forEach((layer, index) => {
    const layerWeight = layer.boxes.reduce((sum, box) => sum + box.boxWeight, 0);
    doc.fontSize(9);
    doc.text(`${layer.layerNumber}`, 50, tableTop);
    doc.text(`${layer.boxes.length}`, 50 + colWidths[0], tableTop);
    doc.text(`${layer.rotation}°`, 50 + colWidths[0] + colWidths[1], tableTop);
    doc.text(`${layerWeight.toFixed(2)}`, 50 + colWidths[0] + colWidths[1] + colWidths[2], tableTop);
    tableTop += rowHeight;
    
    if (tableTop > 750) {
      doc.addPage();
      tableTop = 50;
    }
  });

  // Add visualization images if available
  if (images && (images.view3d || images.front || images.side || images.layer)) {
    doc.moveDown(2);
    doc.addPage();
    doc.fontSize(16).text('Visualization Views', { underline: true });
    doc.moveDown();

    const imageWidth = 250;
    const imageHeight = 188; // Maintain 4:3 aspect ratio
    const pageWidth = doc.page.width - 100; // Account for margins
    const imagesPerRow = Math.floor(pageWidth / (imageWidth + 20));
    const spacing = (pageWidth - (imagesPerRow * imageWidth)) / (imagesPerRow + 1);
    
    let currentX = 50 + spacing;
    let currentY = doc.y;
    let imagesAdded = 0;

    // Helper function to add an image
    const addImage = (imageData: string, label: string) => {
      if (!imageData || imageData.trim().length === 0) {
        console.log(`Skipping ${label}: no image data`);
        return;
      }

      // Check if we need a new page
      if (currentY + imageHeight + 40 > doc.page.height - 50) {
        doc.addPage();
        currentY = 50;
        currentX = 50 + spacing;
        imagesAdded = 0;
      }

      // Check if we need a new row
      if (imagesAdded > 0 && imagesAdded % imagesPerRow === 0) {
        currentY += imageHeight + 50;
        currentX = 50 + spacing;
      }

      try {
        // Remove data URL prefix if present (e.g., "data:image/png;base64,")
        let base64Data = imageData.trim();
        if (base64Data.includes(',')) {
          const parts = base64Data.split(',');
          if (parts.length > 1) {
            base64Data = parts[1];
          }
        }
        
        // Validate base64 data
        if (!base64Data || base64Data.length < 100) {
          throw new Error(`Invalid base64 data for ${label}: too short`);
        }
        
        // Decode base64 to buffer
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        if (imageBuffer.length === 0) {
          throw new Error(`Failed to decode base64 for ${label}`);
        }
        
        console.log(`Adding image ${label}, buffer size: ${imageBuffer.length} bytes`);
        
        // PDFKit can handle PNG/JPEG buffers directly
        // Try to add the image - PDFKit will auto-detect format from buffer
        doc.image(imageBuffer, currentX, currentY, { 
          width: imageWidth, 
          height: imageHeight,
          align: 'center'
        });

        // Add label below image
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(label, currentX, currentY + imageHeight + 5, { width: imageWidth, align: 'center' });
        doc.font('Helvetica');

        currentX += imageWidth + spacing;
        imagesAdded++;
        console.log(`Successfully added image ${label}`);
      } catch (error: any) {
        console.error(`Error adding image ${label}:`, error);
        console.error(`Error details:`, error.message);
        if (error.stack) {
          console.error(`Stack:`, error.stack);
        }
        // Continue with other images even if one fails
        // Add a placeholder text instead
        doc.fontSize(9).font('Helvetica');
        doc.fillColor('red');
        doc.text(`[${label} - Image failed]`, currentX, currentY + imageHeight / 2, { width: imageWidth, align: 'center' });
        doc.fillColor('black');
        currentX += imageWidth + spacing;
        imagesAdded++;
      }
    };

    // Add images in order: 3D, Front, Side, Layer
    if (images.view3d) {
      addImage(images.view3d, '3D View');
    }
    if (images.front) {
      addImage(images.front, 'Front View');
    }
    if (images.side) {
      addImage(images.side, 'Side View');
    }
    if (images.layer) {
      addImage(images.layer, 'Layer View (Top)');
    }
  }

  return doc;
}
