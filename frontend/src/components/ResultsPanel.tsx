import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Arrangement, Pallet, Box } from '../types';
import LoadingSpinner from './common/LoadingSpinner';

interface ResultsPanelProps {
  arrangement: Arrangement;
  pallet?: Pallet;
  box?: Box;
  itemInfo?: { item_id?: string; uom?: string; qty?: number; name?: string };
  onCaptureImages?: () => Promise<{ view3d: string; front: string; side: string; layer: string } | null>;
}

interface OverhangInfo {
  hasOverhang: boolean;
  left: number;
  right: number;
  front: number;
  back: number;
  top: number;
  maxOverhang: number;
}

function calculateOverhang(box: any, pallet: Pallet): OverhangInfo {
  // Pallet base dimensions (without overhang) - this is the actual pallet size
  const baseWidth = pallet.width;
  const baseLength = pallet.length;
  const maxHeight = pallet.max_height;
  const maxOverhangAllowed = pallet.max_overhang || 0;
  
  // Max allowed dimensions (base + overhang allowance on each side)
  const maxWidth = pallet.max_width || (pallet.width + maxOverhangAllowed * 2);
  const maxLength = pallet.max_length || (pallet.length + maxOverhangAllowed * 2);
  
  // Calculate actual overhang relative to base pallet dimensions
  // Left edge: how much box extends to the left of base pallet (x < 0)
  const leftActual = box.x < 0 ? Math.abs(box.x) : 0;
  // Right edge: how much box extends beyond base width
  const rightActual = box.x + box.boxWidth > baseWidth ? (box.x + box.boxWidth) - baseWidth : 0;
  // Front edge: how much box extends to the front of base pallet (y < 0)
  const frontActual = box.y < 0 ? Math.abs(box.y) : 0;
  // Back edge: how much box extends beyond base length
  const backActual = box.y + box.boxLength > baseLength ? (box.y + box.boxLength) - baseLength : 0;
  // Top: how much box extends beyond max height
  const topActual = box.z + box.boxHeight > maxHeight ? (box.z + box.boxHeight) - maxHeight : 0;
  
  // Calculate overhang beyond allowed limits (exceeding max_overhang)
  // Left: if actual overhang exceeds allowed, show the excess
  let left = leftActual > maxOverhangAllowed ? leftActual - maxOverhangAllowed : 0;
  // Right: if actual overhang exceeds allowed, show the excess
  let right = rightActual > maxOverhangAllowed ? rightActual - maxOverhangAllowed : 0;
  // Front: if actual overhang exceeds allowed, show the excess
  let front = frontActual > maxOverhangAllowed ? frontActual - maxOverhangAllowed : 0;
  // Back: if actual overhang exceeds allowed, show the excess
  let back = backActual > maxOverhangAllowed ? backActual - maxOverhangAllowed : 0;
  // Top: any top overhang is a violation
  const top = topActual;
  
  // Also check if box extends beyond max allowed dimensions (safety check)
  const exceedsMaxWidth = box.x + box.boxWidth > maxWidth;
  const exceedsMaxLength = box.y + box.boxLength > maxLength;
  
  // If box exceeds max dimensions, calculate the violation
  if (exceedsMaxWidth) {
    const violation = (box.x + box.boxWidth) - maxWidth;
    right = Math.max(right, violation);
  }
  if (exceedsMaxLength) {
    const violation = (box.y + box.boxLength) - maxLength;
    back = Math.max(back, violation);
  }

  const maxOverhang = Math.max(left, right, front, back, top);
  const hasOverhang = maxOverhang > 0;

  return { hasOverhang, left, right, front, back, top, maxOverhang };
}

function calculateOverallOverhang(arrangement: Arrangement, pallet: Pallet): OverhangInfo {
  let maxLeft = 0, maxRight = 0, maxFront = 0, maxBack = 0, maxTop = 0;

  arrangement.layers.forEach((layer) => {
    layer.boxes.forEach((box) => {
      const overhang = calculateOverhang(box, pallet);
      maxLeft = Math.max(maxLeft, overhang.left);
      maxRight = Math.max(maxRight, overhang.right);
      maxFront = Math.max(maxFront, overhang.front);
      maxBack = Math.max(maxBack, overhang.back);
      maxTop = Math.max(maxTop, overhang.top);
    });
  });

  const maxOverhang = Math.max(maxLeft, maxRight, maxFront, maxBack, maxTop);
  return {
    hasOverhang: maxOverhang > 0,
    left: maxLeft,
    right: maxRight,
    front: maxFront,
    back: maxBack,
    top: maxTop,
    maxOverhang,
  };
}

export default function ResultsPanel({ arrangement, pallet, box, itemInfo, onCaptureImages }: ResultsPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [showLayoutDetails, setShowLayoutDetails] = useState(false);

  const overallOverhang = pallet ? calculateOverallOverhang(arrangement, pallet) : null;

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    if (!pallet || !box) {
      toast.error('Pallet and box information required for export');
      return;
    }

    setExporting(format);
    try {
      if (format === 'pdf') {
        // Capture visualization images
        let images = null;
        if (onCaptureImages) {
          try {
            images = await onCaptureImages();
            console.log('Captured images:', images ? Object.keys(images) : 'null');
          } catch (error: any) {
            console.error('Failed to capture images:', error);
            console.error('Error details:', error.message, error.stack);
            toast.error('Failed to capture visualization images, continuing without them');
          }
        }

        console.log('Sending PDF request with images:', images ? 'yes' : 'no');
        const response = await api.post(
          '/export-pdf',
          { arrangement, palletId: pallet.id, box, itemInfo, images },
          { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `palletizing-report-${Date.now()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('PDF exported successfully');
      } else if (format === 'csv') {
        const response = await api.post(
          '/export/csv',
          { arrangement, pallet, box, itemInfo },
          { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `palletizing-report-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('CSV exported successfully');
      } else if (format === 'excel') {
        const response = await api.post(
          '/export/excel',
          { arrangement, pallet, box, itemInfo },
          { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `palletizing-report-${Date.now()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Excel exported successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-dark-text">Results</h3>
        {pallet && box && (
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="px-3 py-1 text-sm bg-dark-primary hover:bg-dark-primaryHover text-white rounded disabled:opacity-50 flex items-center gap-1"
            >
              {exporting === 'pdf' ? <LoadingSpinner size="sm" /> : null}
              PDF
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              className="px-3 py-1 text-sm bg-dark-primary hover:bg-dark-primaryHover text-white rounded disabled:opacity-50 flex items-center gap-1"
            >
              {exporting === 'csv' ? <LoadingSpinner size="sm" /> : null}
              CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting !== null}
              className="px-3 py-1 text-sm bg-dark-primary hover:bg-dark-primaryHover text-white rounded disabled:opacity-50 flex items-center gap-1"
            >
              {exporting === 'excel' ? <LoadingSpinner size="sm" /> : null}
              Excel
            </button>
          </div>
        )}
      </div>

      {/* Boxes per Layer, Layers per Pallet, and Total Boxes */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-surfaceHover p-4 rounded-md border border-dark-border">
          <div className="text-sm text-dark-textSecondary">Boxes per Layer</div>
          <div className="text-2xl font-bold text-dark-text">{arrangement.boxesPerLayer[0] || 0}</div>
        </div>
        <div className="bg-dark-surfaceHover p-4 rounded-md border border-dark-border">
          <div className="text-sm text-dark-textSecondary">Layers per Pallet</div>
          <div className="text-2xl font-bold text-dark-text">{arrangement.totalLayers}</div>
        </div>
        <div className="bg-dark-surfaceHover p-4 rounded-md border border-dark-border">
          <div className="text-sm text-dark-textSecondary">Total Boxes</div>
          <div className="text-2xl font-bold text-dark-text">{arrangement.totalBoxes}</div>
        </div>
      </div>

      {/* Weight and Cube Utilization */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-surfaceHover p-4 rounded-md border border-dark-border">
          <div className="text-sm text-dark-textSecondary">Total Weight</div>
          <div className="text-2xl font-bold text-dark-text">{arrangement.totalWeight.toFixed(2)} <span className="text-lg text-dark-textSecondary">lbs</span></div>
        </div>
        <div className="bg-dark-surfaceHover p-4 rounded-md border border-dark-border">
          <div className="text-sm text-dark-textSecondary">Weight Utilization</div>
          <div className="text-2xl font-bold text-dark-text">{arrangement.weightUtilization.toFixed(1)}%</div>
        </div>
        <div className="bg-dark-surfaceHover p-4 rounded-md border border-dark-border">
          <div className="text-sm text-dark-textSecondary">Cube Utilization</div>
          <div className="text-2xl font-bold text-dark-text">
            {pallet && box ? (() => {
              // Calculate total box volume
              const totalBoxVolume = arrangement.totalBoxes * box.length * box.width * box.height;
              // Calculate pallet max volume (using pallet's max dimensions)
              const palletMaxVolume = pallet.max_length * pallet.max_width * pallet.max_height;
              // Calculate utilization percentage based on pallet's max capacity
              const cubeUtilization = palletMaxVolume > 0 ? (totalBoxVolume / palletMaxVolume) * 100 : 0;
              return cubeUtilization.toFixed(1);
            })() : '0.0'}%
          </div>
        </div>
      </div>

      {pallet && (
        <div className="bg-dark-surfaceHover p-4 rounded-md border border-dark-border">
          <div className="text-sm text-dark-textSecondary mb-2">Total Size</div>
          <div className="text-lg font-bold text-dark-text">
            {(() => {
              // Calculate actual bounding box of the arrangement
              // Note: In algorithm, x = width, y = length, z = height
              let minX = Infinity, maxX = -Infinity;
              let minY = Infinity, maxY = -Infinity;
              let minZ = Infinity, maxZ = -Infinity;

              arrangement.layers.forEach((layer) => {
                layer.boxes.forEach((box) => {
                  minX = Math.min(minX, box.x);
                  maxX = Math.max(maxX, box.x + box.boxWidth);
                  minY = Math.min(minY, box.y);
                  maxY = Math.max(maxY, box.y + box.boxLength);
                  minZ = Math.min(minZ, box.z);
                  maxZ = Math.max(maxZ, box.z + box.boxHeight);
                });
              });

              // Calculate actual dimensions
              const actualLength = maxY - minY; // y is length direction
              const actualWidth = maxX - minX;   // x is width direction
              const actualHeight = maxZ - minZ;  // z is height direction

              return `${actualLength.toFixed(1)} × ${actualWidth.toFixed(1)} × ${actualHeight.toFixed(1)}`;
            })()} <span className="text-sm text-dark-textSecondary font-normal">in</span>
          </div>
          <div className="text-xs text-dark-textSecondary mt-1">
            (L × W × H) - Volume: {(() => {
              // Calculate actual bounding box of the arrangement
              let minX = Infinity, maxX = -Infinity;
              let minY = Infinity, maxY = -Infinity;
              let minZ = Infinity, maxZ = -Infinity;

              arrangement.layers.forEach((layer) => {
                layer.boxes.forEach((box) => {
                  minX = Math.min(minX, box.x);
                  maxX = Math.max(maxX, box.x + box.boxWidth);
                  minY = Math.min(minY, box.y);
                  maxY = Math.max(maxY, box.y + box.boxLength);
                  minZ = Math.min(minZ, box.z);
                  maxZ = Math.max(maxZ, box.z + box.boxHeight);
                });
              });

              const actualLength = maxY - minY;
              const actualWidth = maxX - minX;
              const actualHeight = maxZ - minZ;
              const volume = actualLength * actualWidth * actualHeight;

              return volume.toFixed(0);
            })()} <span className="text-xs">cu in</span>
          </div>
        </div>
      )}

      {arrangement.weightLimited && (
        <div className="bg-dark-warning/20 border border-dark-warning p-3 rounded-md text-dark-warning">
          ⚠️ Arrangement limited by weight capacity
        </div>
      )}

      {overallOverhang && overallOverhang.hasOverhang && (
        <div className="bg-dark-error/20 border border-dark-error p-3 rounded-md">
          <div className="font-medium text-dark-error mb-2">⚠️ Overhang Detected</div>
          <div className="text-sm text-dark-textSecondary space-y-1">
            {overallOverhang.left > 0 && <div>Left: {overallOverhang.left.toFixed(2)} in</div>}
            {overallOverhang.right > 0 && <div>Right: {overallOverhang.right.toFixed(2)} in</div>}
            {overallOverhang.front > 0 && <div>Front: {overallOverhang.front.toFixed(2)} in</div>}
            {overallOverhang.back > 0 && <div>Back: {overallOverhang.back.toFixed(2)} in</div>}
            {overallOverhang.top > 0 && <div>Top: {overallOverhang.top.toFixed(2)} in</div>}
            <div className="font-medium mt-2">Max Overhang: {overallOverhang.maxOverhang.toFixed(2)} in</div>
          </div>
        </div>
      )}

      {overallOverhang && !overallOverhang.hasOverhang && pallet && (
        <div className="bg-dark-success/20 border border-dark-success p-3 rounded-md text-dark-success text-sm">
          ✓ All boxes fit within pallet boundaries
          {pallet.max_overhang && pallet.max_overhang > 0 && (
            <span> (with {pallet.max_overhang} overhang allowance)</span>
          )}
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-dark-text">Layout Details</h4>
          <button
            onClick={() => setShowLayoutDetails(!showLayoutDetails)}
            className="text-sm text-dark-primary hover:text-dark-primaryHover"
          >
            {showLayoutDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
      </div>

      {showLayoutDetails && pallet && (
        <div className="bg-dark-surface rounded-lg p-4 border border-dark-border">
          <h4 className="font-medium mb-3 text-dark-text">Layout Details</h4>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {arrangement.layers.map((layer) => {
              const layerOverhang = layer.boxes.some(b => calculateOverhang(b, pallet).hasOverhang);
              return (
                <div key={layer.layerNumber} className="border-l-2 border-dark-primary pl-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium text-dark-text">
                      Layer {layer.layerNumber} ({layer.boxes.length} boxes)
                    </div>
                    <div className="text-xs text-dark-textSecondary">
                      Rotation: {layer.rotation}° | Height: {layer.boxes[0]?.z.toFixed(1)} - {(layer.boxes[0]?.z + layer.boxes[0]?.boxHeight).toFixed(1)} in
                    </div>
                  </div>
                  {layerOverhang && (
                    <div className="text-xs text-dark-error mb-2">⚠️ Contains overhanging boxes</div>
                  )}
                  <div className="text-xs text-dark-textSecondary space-y-1">
                    <div className="grid grid-cols-7 gap-2 font-medium text-xs">
                      <div>#</div>
                      <div>Position</div>
                      <div>Size</div>
                      <div>Orientation</div>
                      <div>Overhang</div>
                      <div>Weight</div>
                      <div>Z</div>
                    </div>
                    {layer.boxes.slice(0, 20).map((box, idx) => {
                      const overhang = calculateOverhang(box, pallet);
                      const overhangDetails: string[] = [];
                      if (overhang.left > 0) overhangDetails.push(`L:${overhang.left.toFixed(1)}`);
                      if (overhang.right > 0) overhangDetails.push(`R:${overhang.right.toFixed(1)}`);
                      if (overhang.front > 0) overhangDetails.push(`F:${overhang.front.toFixed(1)}`);
                      if (overhang.back > 0) overhangDetails.push(`B:${overhang.back.toFixed(1)}`);
                      if (overhang.top > 0) overhangDetails.push(`T:${overhang.top.toFixed(1)}`);
                      
                      return (
                        <div key={idx} className="grid grid-cols-7 gap-2 text-xs">
                          <div>{idx + 1}</div>
                          <div className="text-xs">({box.x.toFixed(1)},{box.y.toFixed(1)}) in</div>
                          <div className="text-xs">{box.boxWidth.toFixed(1)}×{box.boxLength.toFixed(1)}×{box.boxHeight.toFixed(1)} in</div>
                          <div className="text-xs">{box.orientation}</div>
                          <div className={`text-xs ${overhang.hasOverhang ? 'text-dark-error font-medium' : 'text-dark-success'}`}>
                            {overhang.hasOverhang ? (
                              <div className="space-y-0.5">
                                <div>{overhang.maxOverhang.toFixed(1)} in</div>
                                {overhangDetails.length > 0 && (
                                  <div className="text-xs opacity-75">({overhangDetails.map(d => d + ' in').join(', ')})</div>
                                )}
                              </div>
                            ) : (
                              'None'
                            )}
                          </div>
                          <div className="text-xs">{box.boxWeight.toFixed(1)} lbs</div>
                          <div className="text-xs">{box.z.toFixed(1)} in</div>
                        </div>
                      );
                    })}
                    {layer.boxes.length > 20 && (
                      <div className="text-xs text-dark-textSecondary italic">
                        ... and {layer.boxes.length - 20} more boxes
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
