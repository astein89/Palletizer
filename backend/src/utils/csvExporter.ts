import { Arrangement, Pallet, Box } from '../types';

export function generateCSV(
  arrangement: Arrangement,
  pallet: Pallet,
  box: Box,
  itemInfo?: { item_id?: string; uom?: string; qty?: number; name?: string }
): string {
  const rows: string[] = [];
  
  // Header row
  rows.push('Field,Value');
  
  // Summary
  rows.push('Summary,');
  rows.push(`Total Boxes,${arrangement.totalBoxes}`);
  rows.push(`Total Layers,${arrangement.totalLayers}`);
  rows.push(`Total Weight,${arrangement.totalWeight.toFixed(2)}`);
  rows.push(`Weight Utilization,${arrangement.weightUtilization.toFixed(1)}%`);
  rows.push(`Weight Limited,${arrangement.weightLimited ? 'Yes' : 'No'}`);
  rows.push(`Height Rotation Allowed,${arrangement.allowHeightRotation ? 'Yes' : 'No'}`);
  rows.push('');
  
  // Pallet Info
  rows.push('Pallet Information,');
  rows.push(`Name,${pallet.name}`);
  rows.push(`Dimensions,${pallet.length} × ${pallet.width} × ${pallet.height}`);
  rows.push(`Max Dimensions,${pallet.max_length} × ${pallet.max_width} × ${pallet.max_height}`);
  if (pallet.max_weight) {
    rows.push(`Max Weight,${pallet.max_weight}`);
    rows.push(`Pallet Weight,${pallet.pallet_weight || 0}`);
  }
  rows.push('');
  
  // Box Info
  rows.push('Box Information,');
  if (itemInfo?.item_id) {
    rows.push(`Item ID,${itemInfo.item_id}`);
    rows.push(`UOM,${itemInfo.uom || ''}`);
    rows.push(`Qty,${itemInfo.qty || ''}`);
    if (itemInfo.name) rows.push(`Name,${itemInfo.name}`);
  }
  rows.push(`Dimensions,${box.length} × ${box.width} × ${box.height}`);
  rows.push(`Weight,${box.weight}`);
  rows.push('');
  
  // Layer Breakdown
  rows.push('Layer Breakdown,');
  rows.push('Layer Number,Boxes,Weight,Rotation');
  arrangement.layers.forEach((layer) => {
    const layerWeight = layer.boxes.reduce((sum, box) => sum + box.boxWeight, 0);
    rows.push(`${layer.layerNumber},${layer.boxes.length},${layerWeight.toFixed(2)},${layer.rotation}°`);
  });
  rows.push('');
  
  // Box Positions
  rows.push('Box Positions,');
  rows.push('Layer,X,Y,Z,Orientation,Length,Width,Height,Weight');
  arrangement.layers.forEach((layer) => {
    layer.boxes.forEach((box) => {
      rows.push(
        `${layer.layerNumber},${box.x},${box.y},${box.z},${box.orientation},${box.boxLength},${box.boxWidth},${box.boxHeight},${box.boxWeight}`
      );
    });
  });
  
  return rows.join('\n');
}
