import * as XLSX from 'xlsx';
import { Arrangement, Pallet, Box } from '../types';

export function generateExcel(
  arrangement: Arrangement,
  pallet: Pallet,
  box: Box,
  itemInfo?: { item_id?: string; uom?: string; qty?: number; name?: string }
): Buffer {
  const workbook = XLSX.utils.book_new();
  
  // Summary Sheet
  const summaryData = [
    ['Palletizing Report'],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['Summary'],
    ['Total Boxes', arrangement.totalBoxes],
    ['Total Layers', arrangement.totalLayers],
    ['Total Weight', arrangement.totalWeight],
    ['Weight Utilization (%)', arrangement.weightUtilization],
    ['Weight Limited', arrangement.weightLimited ? 'Yes' : 'No'],
    ['Height Rotation Allowed', arrangement.allowHeightRotation ? 'Yes' : 'No'],
    [],
    ['Pallet Information'],
    ['Name', pallet.name],
    ['Dimensions', `${pallet.length} × ${pallet.width} × ${pallet.height}`],
    ['Max Dimensions', `${pallet.max_length} × ${pallet.max_width} × ${pallet.max_height}`],
  ];
  
  if (pallet.max_weight) {
    summaryData.push(['Max Weight', pallet.max_weight]);
    summaryData.push(['Pallet Weight', pallet.pallet_weight || 0]);
  }
  
  summaryData.push([], ['Box Information']);
  if (itemInfo?.item_id) {
    summaryData.push(['Item ID', itemInfo.item_id]);
    summaryData.push(['UOM', itemInfo.uom || '']);
    summaryData.push(['Qty', itemInfo.qty || '']);
    if (itemInfo.name) summaryData.push(['Name', itemInfo.name]);
  }
  summaryData.push(['Dimensions', `${box.length} × ${box.width} × ${box.height}`]);
  summaryData.push(['Weight', box.weight]);
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Layer Breakdown Sheet
  const layerData = [
    ['Layer Number', 'Boxes', 'Weight', 'Rotation']
  ];
  
  arrangement.layers.forEach((layer) => {
    const layerWeight = layer.boxes.reduce((sum, box) => sum + box.boxWeight, 0);
    layerData.push([
      layer.layerNumber,
      layer.boxes.length,
      layerWeight,
      `${layer.rotation}°`
    ]);
  });
  
  const layerSheet = XLSX.utils.aoa_to_sheet(layerData);
  XLSX.utils.book_append_sheet(workbook, layerSheet, 'Layer Breakdown');
  
  // Box Positions Sheet
  const positionsData = [
    ['Layer', 'X', 'Y', 'Z', 'Orientation', 'Length', 'Width', 'Height', 'Weight']
  ];
  
  arrangement.layers.forEach((layer) => {
    layer.boxes.forEach((box) => {
      positionsData.push([
        layer.layerNumber,
        box.x,
        box.y,
        box.z,
        box.orientation,
        box.boxLength,
        box.boxWidth,
        box.boxHeight,
        box.boxWeight
      ]);
    });
  });
  
  const positionsSheet = XLSX.utils.aoa_to_sheet(positionsData);
  XLSX.utils.book_append_sheet(workbook, positionsSheet, 'Box Positions');
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
