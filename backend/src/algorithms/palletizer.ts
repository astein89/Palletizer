import { Box, Pallet, Arrangement, Layer, BoxPlacement } from '../types';

type StackPattern = 'auto' | 'block' | 'split-block' | 'brick' | 'pinwheel' | 'row' | 'split-row';

interface Orientation {
  l: number;
  w: number;
  h: number;
  name: string;
}

// Helper function to calculate bounding box of a layer
function getLayerBounds(boxes: BoxPlacement[]): { minX: number; maxX: number; minY: number; maxY: number } | null {
  if (boxes.length === 0) return null;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  boxes.forEach((box) => {
    const boxRight = box.x + box.boxWidth;
    const boxTop = box.y + box.boxLength;
    
    minX = Math.min(minX, box.x);
    maxX = Math.max(maxX, boxRight);
    minY = Math.min(minY, box.y);
    maxY = Math.max(maxY, boxTop);
  });
  
  return { minX, maxX, minY, maxY };
}

// Helper function to shift boxes to keep them within a bounding box (keep boxes whole)
function shiftBoxesWithinBoundingBox(
  boxes: BoxPlacement[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): BoxPlacement[] {
  if (boxes.length === 0) return boxes;
  
  // Calculate bounding box of all boxes
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  boxes.forEach((box) => {
    minX = Math.min(minX, box.x);
    maxX = Math.max(maxX, box.x + box.boxWidth);
    minY = Math.min(minY, box.y);
    maxY = Math.max(maxY, box.y + box.boxLength);
  });
  
  const totalWidth = maxX - minX;
  const totalLength = maxY - minY;
  const boundsWidth = bounds.maxX - bounds.minX;
  const boundsLength = bounds.maxY - bounds.minY;
  
  // Calculate shift needed to keep boxes within bounds
  let shiftX = 0;
  let shiftY = 0;
  
  // Handle X direction
  if (totalWidth > boundsWidth) {
    // Arrangement is larger than bounds - center it (but this shouldn't happen if algorithm is correct)
    shiftX = (boundsWidth - totalWidth) / 2 - minX + bounds.minX;
  } else {
    // Arrangement fits - shift to keep within bounds
    if (minX < bounds.minX) {
      shiftX = bounds.minX - minX; // Shift right to bring left edge to bounds.minX
    } else if (maxX > bounds.maxX) {
      shiftX = bounds.maxX - maxX; // Shift left to bring right edge to bounds.maxX
    }
  }
  
  // Handle Y direction
  if (totalLength > boundsLength) {
    // Arrangement is larger than bounds - center it (but this shouldn't happen if algorithm is correct)
    shiftY = (boundsLength - totalLength) / 2 - minY + bounds.minY;
  } else {
    // Arrangement fits - shift to keep within bounds
    if (minY < bounds.minY) {
      shiftY = bounds.minY - minY; // Shift forward to bring front edge to bounds.minY
    } else if (maxY > bounds.maxY) {
      shiftY = bounds.maxY - maxY; // Shift back to bring back edge to bounds.maxY
    }
  }
  
  // Apply shift to all boxes
  return boxes.map((box) => ({
    ...box,
    x: box.x + shiftX,
    y: box.y + shiftY,
  }));
}

// Helper function to shift boxes to keep them within bounds (keep boxes whole)
function shiftBoxesWithinBounds(
  boxes: BoxPlacement[],
  pallet: Pallet,
  allowOverhang: boolean
): BoxPlacement[] {
  if (boxes.length === 0) return boxes;
  
  const maxLength = allowOverhang
    ? (pallet.max_length || (pallet.length + (pallet.max_overhang || 0) * 2))
    : pallet.length;
  const maxWidth = allowOverhang
    ? (pallet.max_width || (pallet.width + (pallet.max_overhang || 0) * 2))
    : pallet.width;

  // Calculate bounding box of all boxes
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  boxes.forEach((box) => {
    minX = Math.min(minX, box.x);
    maxX = Math.max(maxX, box.x + box.boxWidth);
    minY = Math.min(minY, box.y);
    maxY = Math.max(maxY, box.y + box.boxLength);
  });
  
  const totalWidth = maxX - minX;
  const totalLength = maxY - minY;
  
  // Calculate shift needed to keep boxes within bounds
  let shiftX = 0;
  let shiftY = 0;
  
  // Handle X direction
  if (totalWidth > maxWidth) {
    // Arrangement is larger than bounds - center it (but this shouldn't happen if algorithm is correct)
    shiftX = (maxWidth - totalWidth) / 2 - minX;
  } else {
    // Arrangement fits - shift to keep within bounds
    if (minX < 0) {
      shiftX = -minX; // Shift right to bring left edge to 0
    } else if (maxX > maxWidth) {
      shiftX = maxWidth - maxX; // Shift left to bring right edge to maxWidth
    }
  }
  
  // Handle Y direction
  if (totalLength > maxLength) {
    // Arrangement is larger than bounds - center it (but this shouldn't happen if algorithm is correct)
    shiftY = (maxLength - totalLength) / 2 - minY;
  } else {
    // Arrangement fits - shift to keep within bounds
    if (minY < 0) {
      shiftY = -minY; // Shift forward to bring front edge to 0
    } else if (maxY > maxLength) {
      shiftY = maxLength - maxY; // Shift back to bring back edge to maxLength
    }
  }
  
  // Apply shift to all boxes
  return boxes.map((box) => ({
    ...box,
    x: box.x + shiftX,
    y: box.y + shiftY,
  }));
}

function selectOptimalPattern(
  box: Box,
  pallet: Pallet,
  bestLayer: Layer
): StackPattern {
  const allowOverhang = box.allowOverhang !== undefined ? box.allowOverhang : true;
  const patterns: StackPattern[] = ['block', 'brick', 'pinwheel', 'row'];
  
  let bestPattern: StackPattern = 'block';
  let bestScore = -1;
  
  for (const pattern of patterns) {
    const arrangement = stackLayers(
      bestLayer,
      box.height,
      pallet.max_height,
      pallet,
      allowOverhang,
      pattern
    );
    
    // Calculate score: primary = box count, secondary = stability bonus
    let score = arrangement.totalBoxes;
    
    // Stability bonus for interlocking patterns
    const stabilityBonus = {
      'block': 0,
      'brick': 0.5,
      'pinwheel': 1.0,
      'row': 0.3,
    };
    
    score += stabilityBonus[pattern] * 0.1; // Small bonus to prefer stable patterns when box count is similar
    
    // Cube utilization bonus (volume efficiency)
    const cubeUtilization = (arrangement.totalBoxes * box.length * box.width * box.height) /
      (pallet.max_length! * pallet.max_width! * pallet.max_height);
    score += cubeUtilization * 0.05;
    
    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }
  
  return bestPattern;
}

export function palletize(box: Box, pallet: Pallet): Arrangement {
  const allowHeightRotation = box.allowHeightRotation ?? false;
  const allowOverhang = box.allowOverhang !== undefined ? box.allowOverhang : true;
  const stackPattern = box.stackPattern || 'auto';
  let bestArrangement: Arrangement;
  let bestLayer: Layer;

  if (allowHeightRotation) {
    // Try all 6 orientations
    const orientations: Orientation[] = [
      { l: box.length, w: box.width, h: box.height, name: 'l×w×h' },
      { l: box.length, w: box.height, h: box.width, name: 'l×h×w' },
      { l: box.width, w: box.length, h: box.height, name: 'w×l×h' },
      { l: box.width, w: box.height, h: box.length, name: 'w×h×l' },
      { l: box.height, w: box.length, h: box.width, name: 'h×l×w' },
      { l: box.height, w: box.width, h: box.length, name: 'h×w×l' },
    ];

    const uniformResults = orientations.map((orient) =>
      calculateLayer(orient.l, orient.w, pallet, orient.name, allowOverhang)
    );

    const mixed = calculateMixedLayer(box, pallet, true, allowOverhang);
    bestLayer = selectBest(...uniformResults, mixed);
  } else {
    // Original 2-orientation logic
    const uniformLW = calculateLayer(box.length, box.width, pallet, 'uniform-lw', allowOverhang);
    const uniformWL = calculateLayer(box.width, box.length, pallet, 'uniform-wl', allowOverhang);
    const mixed = calculateMixedLayer(box, pallet, false, allowOverhang);
    bestLayer = selectBest(uniformLW, uniformWL, mixed);
  }

  // Determine which pattern to use
  const patternToUse: StackPattern = stackPattern === 'auto'
    ? selectOptimalPattern(box, pallet, bestLayer)
    : stackPattern;

  bestArrangement = stackLayers(
    bestLayer,
    box.height,
    pallet.max_height,
    pallet,
    allowOverhang,
    patternToUse
  );

  // Apply weight constraints
  return applyWeightConstraints(bestArrangement, box.weight, pallet);
}

function calculateLayer(
  boxLength: number,
  boxWidth: number,
  pallet: Pallet,
  orientationName: string,
  allowOverhang: boolean = true
): Layer {
  // Use base dimensions if overhang not allowed, otherwise use max dimensions
  const maxLength = allowOverhang 
    ? (pallet.max_length || (pallet.length + (pallet.max_overhang || 0) * 2))
    : pallet.length;
  const maxWidth = allowOverhang
    ? (pallet.max_width || (pallet.width + (pallet.max_overhang || 0) * 2))
    : pallet.width;
  
  const boxesPerRow = Math.floor(maxLength / boxLength);
  const boxesPerCol = Math.floor(maxWidth / boxWidth);
  const boxesPerLayer = boxesPerRow * boxesPerCol;

  const boxes: BoxPlacement[] = [];
  for (let row = 0; row < boxesPerRow; row++) {
    for (let col = 0; col < boxesPerCol; col++) {
      boxes.push({
        x: col * boxWidth,
        y: row * boxLength,
        z: 0,
        orientation: getOrientationType(orientationName),
        boxLength,
        boxWidth,
        boxHeight: 0, // Will be set in stackLayers
        boxWeight: 0, // Will be set in stackLayers
      });
    }
  }

  return {
    layerNumber: 1,
    rotation: 0,
    boxes,
    hasMixedOrientations: false,
  };
}

function calculateMixedLayer(box: Box, pallet: Pallet, allowHeightRotation: boolean, allowOverhang: boolean = true): Layer {
  // Use 2D bin-packing with individual box rotation to maximize boxes per layer
  // This allows each box to be rotated independently for optimal fit
  
  const orientations: Array<{ length: number; width: number; name: string }> = allowHeightRotation
    ? [
        { length: box.length, width: box.width, name: 'l×w' },
        { length: box.length, width: box.height, name: 'l×h' },
        { length: box.width, width: box.length, name: 'w×l' },
        { length: box.width, width: box.height, name: 'w×h' },
        { length: box.height, width: box.length, name: 'h×l' },
        { length: box.height, width: box.width, name: 'h×w' },
      ]
    : [
        { length: box.length, width: box.width, name: 'l×w' },
        { length: box.width, width: box.length, name: 'w×l' },
      ];

  // Try each orientation as the primary and see which gives best results
  let bestLayer: Layer | null = null;
  let maxBoxes = 0;

  for (const primaryOrient of orientations) {
    const layer = packBoxesWithRotation(
      primaryOrient.length,
      primaryOrient.width,
      orientations,
      pallet,
      primaryOrient.name,
      allowOverhang
    );
    
    if (layer.boxes.length > maxBoxes) {
      maxBoxes = layer.boxes.length;
      bestLayer = layer;
    }
  }

  // Fallback to simple uniform if packing fails
  if (!bestLayer || bestLayer.boxes.length === 0) {
    const lwLayer = calculateLayer(box.length, box.width, pallet, 'l×w', allowOverhang);
    const wlLayer = calculateLayer(box.width, box.length, pallet, 'w×l', allowOverhang);
    return lwLayer.boxes.length >= wlLayer.boxes.length ? lwLayer : wlLayer;
  }

  // Center the mixed layer with rotated boxes
  return centerLayer(bestLayer, pallet, allowOverhang);
}

function packBoxesWithRotation(
  primaryLength: number,
  primaryWidth: number,
  orientations: Array<{ length: number; width: number; name: string }>,
  pallet: Pallet,
  primaryName: string,
  allowOverhang: boolean = true
): Layer {
  // Use Bottom-Left-Fill algorithm with individual box rotation
  // Use base dimensions if overhang not allowed, otherwise use max dimensions
  const maxLength = allowOverhang
    ? (pallet.max_length || (pallet.length + (pallet.max_overhang || 0) * 2))
    : pallet.length;
  const maxWidth = allowOverhang
    ? (pallet.max_width || (pallet.width + (pallet.max_overhang || 0) * 2))
    : pallet.width;
  
  const placedBoxes: BoxPlacement[] = [];
  const occupiedAreas: Array<{ x: number; y: number; width: number; length: number }> = [];

  // Try to place boxes one by one, trying each orientation
  let attempts = 0;
  const maxAttempts = 1000; // Prevent infinite loops

  while (attempts < maxAttempts) {
    let placed = false;
    
    // Try each orientation for the next box
    for (const orient of orientations) {
      const boxLength = orient.length;
      const boxWidth = orient.width;
      
      // Find the best position (bottom-left fill)
      const position = findBestPosition(
        boxLength,
        boxWidth,
        maxLength,
        maxWidth,
        occupiedAreas
      );

      if (position) {
        // Place the box
        placedBoxes.push({
          x: position.x,
          y: position.y,
          z: 0,
          orientation: getOrientationType(orient.name) as BoxPlacement['orientation'],
          boxLength,
          boxWidth,
          boxHeight: 0,
          boxWeight: 0,
        });

        occupiedAreas.push({
          x: position.x,
          y: position.y,
          width: boxWidth,
          length: boxLength,
        });

        placed = true;
        break; // Successfully placed, move to next box
      }
    }

    if (!placed) {
      // Can't place any more boxes
      break;
    }

    attempts++;
  }

  return {
    layerNumber: 1,
    rotation: 0,
    boxes: placedBoxes,
    hasMixedOrientations: placedBoxes.some((b, i) => 
      i > 0 && b.orientation !== placedBoxes[0].orientation
    ),
  };
}

function findBestPosition(
  boxLength: number,
  boxWidth: number,
  maxLength: number,
  maxWidth: number,
  occupiedAreas: Array<{ x: number; y: number; width: number; length: number }>
): { x: number; y: number } | null {
  // Bottom-Left-Fill: Try positions from bottom-left, moving right then up
  // Use a smart step size: smaller of box dimensions / 4, but at least 1
  const step = Math.max(1, Math.min(boxLength, boxWidth) / 4);
  
  // First, try exact positions (0, 0) and aligned with existing boxes
  const candidatePositions: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
  
  // Add positions aligned with existing boxes (right and top edges)
  for (const occupied of occupiedAreas) {
    candidatePositions.push(
      { x: occupied.x + occupied.width, y: occupied.y }, // Right of box
      { x: occupied.x, y: occupied.y + occupied.length }  // Top of box
    );
  }
  
  // Try candidate positions first (faster)
  for (const pos of candidatePositions) {
    if (pos.x + boxWidth <= maxWidth && pos.y + boxLength <= maxLength) {
      if (canPlaceBox(pos.x, pos.y, boxWidth, boxLength, occupiedAreas, maxWidth, maxLength)) {
        return pos;
      }
    }
  }
  
  // If no candidate position works, try grid search with step size
  for (let y = 0; y <= maxLength - boxLength; y += step) {
    for (let x = 0; x <= maxWidth - boxWidth; x += step) {
      if (canPlaceBox(x, y, boxWidth, boxLength, occupiedAreas, maxWidth, maxLength)) {
        return { x, y };
      }
    }
  }

  return null;
}

function canPlaceBox(
  x: number,
  y: number,
  width: number,
  length: number,
  occupiedAreas: Array<{ x: number; y: number; width: number; length: number }>,
  maxWidth: number,
  maxLength: number
): boolean {
  // Check bounds
  if (x + width > maxWidth || y + length > maxLength) {
    return false;
  }

  // Check for overlaps with existing boxes
  for (const occupied of occupiedAreas) {
    if (
      x < occupied.x + occupied.width &&
      x + width > occupied.x &&
      y < occupied.y + occupied.length &&
      y + length > occupied.y
    ) {
      return false; // Overlaps with existing box
    }
  }

  return true;
}

function getOrientationType(name: string): BoxPlacement['orientation'] {
  if (name.includes('l×w') || name === 'uniform-lw') return 'l×w';
  if (name.includes('w×l') || name === 'uniform-wl') return 'w×l';
  if (name.includes('l×h')) return 'l×h';
  if (name.includes('h×l')) return 'h×l';
  if (name.includes('w×h')) return 'w×h';
  if (name.includes('h×w')) return 'h×w';
  return 'l×w';
}

function selectBest(...layers: Layer[]): Layer {
  return layers.reduce((best, current) =>
    current.boxes.length > best.boxes.length ? current : best
  );
}

function centerLayer(layer: Layer, pallet: Pallet, allowOverhang: boolean = true): Layer {
  if (layer.boxes.length === 0) return layer;

  // Calculate the bounding box of all boxes (handles rotated boxes correctly)
  // For rotated boxes, boxLength and boxWidth may be swapped, but we use the actual dimensions
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  layer.boxes.forEach((box) => {
    // Use actual box dimensions (boxWidth and boxLength) regardless of orientation
    // This correctly handles rotated boxes where dimensions may be swapped
    const boxRight = box.x + box.boxWidth;
    const boxTop = box.y + box.boxLength;
    
    minX = Math.min(minX, box.x);
    maxX = Math.max(maxX, boxRight);
    minY = Math.min(minY, box.y);
    maxY = Math.max(maxY, boxTop);
  });

  const totalWidth = maxX - minX;
  const totalLength = maxY - minY;

  // Calculate center offset to center the entire arrangement on the pallet
  // Always center on base pallet dimensions to ensure even distribution of overhang
  // When overhang is allowed, boxes can extend beyond base dimensions, but should be centered on base
  const baseWidth = pallet.width;
  const baseLength = pallet.length;
  const maxWidth = allowOverhang
    ? (pallet.max_width || (pallet.width + (pallet.max_overhang || 0) * 2))
    : pallet.width;
  const maxLength = allowOverhang
    ? (pallet.max_length || (pallet.length + (pallet.max_overhang || 0) * 2))
    : pallet.length;

  // Center the bounding box on the base pallet dimensions
  // This ensures overhang is evenly distributed on both sides
  let offsetX = (baseWidth - totalWidth) / 2 - minX;
  let offsetY = (baseLength - totalLength) / 2 - minY;
  
  // If the arrangement is larger than base dimensions, ensure it doesn't exceed max dimensions
  // But still try to center on base as much as possible for even overhang distribution
  if (totalWidth > baseWidth && allowOverhang) {
    const maxOverhangAllowed = pallet.max_overhang || 0;
    const maxTotalWidth = baseWidth + (maxOverhangAllowed * 2);
    if (totalWidth > maxTotalWidth) {
      // Too large, center on max dimensions instead (but this shouldn't happen if algorithm is correct)
      offsetX = (maxWidth - totalWidth) / 2 - minX;
    }
    // Otherwise, keep centered on base (offsetX already set above)
  }
  
  if (totalLength > baseLength && allowOverhang) {
    const maxOverhangAllowed = pallet.max_overhang || 0;
    const maxTotalLength = baseLength + (maxOverhangAllowed * 2);
    if (totalLength > maxTotalLength) {
      // Too large, center on max dimensions instead (but this shouldn't happen if algorithm is correct)
      offsetY = (maxLength - totalLength) / 2 - minY;
    }
    // Otherwise, keep centered on base (offsetY already set above)
  }

  // Apply offset to all boxes (works for both rotated and non-rotated boxes)
  return {
    ...layer,
    boxes: layer.boxes.map((box) => ({
      ...box,
      x: box.x + offsetX,
      y: box.y + offsetY,
    })),
  };
}

function applyStackPattern(
  layerTemplate: Layer,
  layerNumber: number,
  stackPattern: StackPattern,
  pallet: Pallet,
  allowOverhang: boolean
): Layer {
  switch (stackPattern) {
    case 'block':
      return applyBlockPattern(layerTemplate, layerNumber, pallet, allowOverhang);
    case 'split-block':
      return applySplitBlockPattern(layerTemplate, layerNumber, pallet, allowOverhang);
    case 'brick':
      return applyBrickPattern(layerTemplate, layerNumber, pallet, allowOverhang);
    case 'pinwheel':
      return applyPinwheelPattern(layerTemplate, layerNumber, pallet, allowOverhang);
    case 'row':
      return applyRowPattern(layerTemplate, layerNumber, pallet, allowOverhang);
    case 'split-row':
      return applySplitRowPattern(layerTemplate, layerNumber, pallet, allowOverhang);
    default:
      return layerTemplate;
  }
}

function stackLayers(
  layerTemplate: Layer,
  boxHeight: number,
  maxHeight: number,
  pallet: Pallet,
  allowOverhang: boolean = true,
  stackPattern: StackPattern = 'block'
): Arrangement {
  // Center the layer template first
  const centeredTemplate = centerLayer(layerTemplate, pallet, allowOverhang);

  let currentHeight = 0;
  let layerNumber = 1;
  const layers: Layer[] = [];
  let firstLayerBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

  while (currentHeight + boxHeight <= maxHeight) {
    // Apply stack pattern transformation
    let transformedLayer = applyStackPattern(
      centeredTemplate,
      layerNumber,
      stackPattern,
      pallet,
      allowOverhang
    );

    // Shift boxes to keep them within pallet bounds (keep boxes whole)
    let shiftedBoxes = shiftBoxesWithinBounds(transformedLayer.boxes, pallet, allowOverhang);
    
    // Filter out any boxes that are still outside bounds after shifting
    const maxLength = allowOverhang
      ? (pallet.max_length || (pallet.length + (pallet.max_overhang || 0) * 2))
      : pallet.length;
    const maxWidth = allowOverhang
      ? (pallet.max_width || (pallet.width + (pallet.max_overhang || 0) * 2))
      : pallet.width;
    
    shiftedBoxes = shiftedBoxes.filter((box) => {
      const boxRight = box.x + box.boxWidth;
      const boxTop = box.y + box.boxLength;
      return box.x >= 0 && box.y >= 0 && boxRight <= maxWidth && boxTop <= maxLength;
    });
    
    transformedLayer = {
      ...transformedLayer,
      boxes: shiftedBoxes,
    };

    const layer: Layer = {
      ...transformedLayer,
      layerNumber,
    };

    // Set z position and box height/weight for each box
    layer.boxes = layer.boxes.map((box) => ({
      ...box,
      z: currentHeight,
      boxHeight,
      boxWeight: 0, // Will be set in applyWeightConstraints
    }));

    // Store first layer bounds for all subsequent layers to reference
    if (layerNumber === 1) {
      firstLayerBounds = getLayerBounds(layer.boxes);
    }

    // For layers above the first, ensure they don't overhang the first layer
    if (layerNumber > 1 && firstLayerBounds) {
      // Shift boxes to stay within the bounding box of the first layer (keep boxes whole)
      let constrainedBoxes = shiftBoxesWithinBoundingBox(layer.boxes, firstLayerBounds);
      
      // Filter out any boxes that are still outside first layer bounds after shifting
      constrainedBoxes = constrainedBoxes.filter((box) => {
        const boxRight = box.x + box.boxWidth;
        const boxTop = box.y + box.boxLength;
        return box.x >= firstLayerBounds!.minX && 
               box.y >= firstLayerBounds!.minY && 
               boxRight <= firstLayerBounds!.maxX && 
               boxTop <= firstLayerBounds!.maxY;
      });
      
      layer.boxes = constrainedBoxes;
    }

    layers.push(layer);
    currentHeight += boxHeight;
    layerNumber++;
  }

  return {
    totalBoxes: layers.reduce((sum, l) => sum + l.boxes.length, 0),
    totalLayers: layers.length,
    boxesPerLayer: layers.map((l) => l.boxes.length),
    allowHeightRotation: false,
    totalWeight: 0,
    weightUtilization: 0,
    weightLimited: false,
    layers,
    stackPattern,
  };
}

// Pattern transformation functions
function applyBlockPattern(
  layerTemplate: Layer,
  layerNumber: number,
  pallet: Pallet,
  allowOverhang: boolean
): Layer {
  // Block pattern: no transformation, all layers identical
  return layerTemplate;
}

function applySplitBlockPattern(
  layerTemplate: Layer,
  layerNumber: number,
  pallet: Pallet,
  allowOverhang: boolean
): Layer {
  // Split Block: offset alternating layers by half box width
  if (layerNumber % 2 === 0) {
    // Even layers: offset by half box width
    const offsetX = layerTemplate.boxes.length > 0 ? layerTemplate.boxes[0].boxWidth / 2 : 0;
    return {
      ...layerTemplate,
      boxes: layerTemplate.boxes.map((box) => ({
        ...box,
        x: box.x + offsetX,
      })),
    };
  }
  return layerTemplate;
}

function applyBrickPattern(
  layerTemplate: Layer,
  layerNumber: number,
  pallet: Pallet,
  allowOverhang: boolean
): Layer {
  // Brick: alternate boxes within each layer (brick-laying pattern)
  // Group boxes by row (y coordinate) and offset alternating rows by half box width
  if (layerTemplate.boxes.length === 0) {
    return layerTemplate;
  }
  
  // Group boxes by row (y coordinate) - use rounded values to handle floating point
  const rows = new Map<number, BoxPlacement[]>();
  layerTemplate.boxes.forEach((box) => {
    const rowKey = Math.round(box.y * 1000) / 1000; // Round to avoid floating point issues
    if (!rows.has(rowKey)) {
      rows.set(rowKey, []);
    }
    rows.get(rowKey)!.push(box);
  });
  
  // Get box width for offset calculation
  const boxWidth = layerTemplate.boxes[0].boxWidth;
  const offsetX = boxWidth / 2;
  
  // Apply brick pattern: offset alternating rows
  const brickBoxes: BoxPlacement[] = [];
  const sortedRows = Array.from(rows.entries()).sort((a, b) => a[0] - b[0]);
  
  sortedRows.forEach(([y, boxes], rowIndex) => {
    // Even rows (0-indexed): no offset, odd rows: offset by half box width
    const shouldOffset = rowIndex % 2 === 1;
    
    boxes.forEach((box) => {
      brickBoxes.push({
        ...box,
        x: shouldOffset ? box.x + offsetX : box.x,
      });
    });
  });
  
  return {
    ...layerTemplate,
    boxes: brickBoxes,
  };
}

function rotateBox90(
  box: BoxPlacement,
  palletLength: number,
  palletWidth: number
): BoxPlacement {
  // Rotate 90° clockwise: (x, y) → (palletLength - y, x)
  // Also swap boxLength and boxWidth, and adjust orientation
  const newX = palletLength - box.y - box.boxLength;
  const newY = box.x;
  
  // Swap dimensions
  const newBoxLength = box.boxWidth;
  const newBoxWidth = box.boxLength;
  
  // Update orientation
  let newOrientation: BoxPlacement['orientation'] = box.orientation;
  if (box.orientation === 'l×w') newOrientation = 'w×l';
  else if (box.orientation === 'w×l') newOrientation = 'l×w';
  else if (box.orientation === 'l×h') newOrientation = 'h×l';
  else if (box.orientation === 'h×l') newOrientation = 'l×h';
  else if (box.orientation === 'w×h') newOrientation = 'h×w';
  else if (box.orientation === 'h×w') newOrientation = 'w×h';
  
  return {
    ...box,
    x: newX,
    y: newY,
    boxLength: newBoxLength,
    boxWidth: newBoxWidth,
    orientation: newOrientation,
  };
}

function applyPinwheelPattern(
  layerTemplate: Layer,
  layerNumber: number,
  pallet: Pallet,
  allowOverhang: boolean
): Layer {
  // Pinwheel: rotate each layer 90° from the original template (0°, 90°, 180°, 270°, repeat)
  const rotationCount = (layerNumber - 1) % 4;
  
  if (rotationCount === 0) {
    return layerTemplate; // 0° - no rotation
  }
  
  const maxLength = allowOverhang
    ? (pallet.max_length || (pallet.length + (pallet.max_overhang || 0) * 2))
    : pallet.length;
  const maxWidth = allowOverhang
    ? (pallet.max_width || (pallet.width + (pallet.max_overhang || 0) * 2))
    : pallet.width;
  
  // Calculate the bounding box of the original layer to use as rotation center
  const originalBounds = getLayerBounds(layerTemplate.boxes);
  if (!originalBounds) {
    return layerTemplate;
  }
  
  const centerX = (originalBounds.minX + originalBounds.maxX) / 2;
  const centerY = (originalBounds.minY + originalBounds.maxY) / 2;
  
  // Rotate from original template, not cumulative
  let transformedBoxes = layerTemplate.boxes.map((box) => {
    // Translate to center, rotate, then translate back
    // For 90° rotation: (x, y) → (-y, x) relative to center
    const relX = box.x - centerX;
    const relY = box.y - centerY;
    
    let newRelX = relX;
    let newRelY = relY;
    let newBoxLength = box.boxLength;
    let newBoxWidth = box.boxWidth;
    let newOrientation = box.orientation;
    
    // Apply rotation multiple times if needed (90°, 180°, 270°)
    for (let i = 0; i < rotationCount; i++) {
      // Rotate 90° clockwise: (x, y) → (-y, x)
      const tempX = newRelX;
      newRelX = -newRelY;
      newRelY = tempX;
      
      // Swap dimensions
      const tempLength = newBoxLength;
      newBoxLength = newBoxWidth;
      newBoxWidth = tempLength;
      
      // Update orientation
      if (newOrientation === 'l×w') newOrientation = 'w×l';
      else if (newOrientation === 'w×l') newOrientation = 'l×w';
      else if (newOrientation === 'l×h') newOrientation = 'h×l';
      else if (newOrientation === 'h×l') newOrientation = 'l×h';
      else if (newOrientation === 'w×h') newOrientation = 'h×w';
      else if (newOrientation === 'h×w') newOrientation = 'w×h';
    }
    
    // Translate back from center
    return {
      ...box,
      x: centerX + newRelX,
      y: centerY + newRelY,
      boxLength: newBoxLength,
      boxWidth: newBoxWidth,
      orientation: newOrientation,
    };
  });
  
  return {
    ...layerTemplate,
    boxes: transformedBoxes,
    rotation: (rotationCount * 90) as 0 | 180, // Note: TypeScript limitation, but we track actual rotation
  };
}

function applyRowPattern(
  layerTemplate: Layer,
  layerNumber: number,
  pallet: Pallet,
  allowOverhang: boolean
): Layer {
  // Row: reverse row order for alternating layers
  if (layerNumber % 2 === 0) {
    // Even layers: reverse rows
    // Group boxes by row (y coordinate)
    const rows = new Map<number, BoxPlacement[]>();
    layerTemplate.boxes.forEach((box) => {
      const rowKey = Math.round(box.y * 1000) / 1000; // Round to avoid floating point issues
      if (!rows.has(rowKey)) {
        rows.set(rowKey, []);
      }
      rows.get(rowKey)!.push(box);
    });
    
    const sortedRows = Array.from(rows.entries()).sort((a, b) => a[0] - b[0]);
    if (sortedRows.length === 0) return layerTemplate;
    
    const minY = sortedRows[0][0];
    const maxY = sortedRows[sortedRows.length - 1][0];
    
    const reversedBoxes: BoxPlacement[] = [];
    sortedRows.forEach(([y, boxes]) => {
      // Reverse the Y position within the bounding box
      const newY = maxY - (y - minY);
      boxes.forEach((box) => {
        reversedBoxes.push({
          ...box,
          y: newY,
        });
      });
    });
    
    return {
      ...layerTemplate,
      boxes: reversedBoxes,
    };
  }
  return layerTemplate;
}

function applySplitRowPattern(
  layerTemplate: Layer,
  layerNumber: number,
  pallet: Pallet,
  allowOverhang: boolean
): Layer {
  // Split Row: similar to Row but with additional column splits
  // First apply row pattern
  let layer = applyRowPattern(layerTemplate, layerNumber, pallet, allowOverhang);
  
  // Then split columns for even layers
  if (layerNumber % 2 === 0) {
    // Group boxes by column (x coordinate)
    const cols = new Map<number, BoxPlacement[]>();
    layer.boxes.forEach((box) => {
      const colKey = Math.round(box.x * 1000) / 1000; // Round to avoid floating point issues
      if (!cols.has(colKey)) {
        cols.set(colKey, []);
      }
      cols.get(colKey)!.push(box);
    });
    
    const sortedCols = Array.from(cols.entries()).sort((a, b) => a[0] - b[0]);
    if (sortedCols.length === 0) return layer;
    
    const minX = sortedCols[0][0];
    const maxX = sortedCols[sortedCols.length - 1][0];
    
    const splitBoxes: BoxPlacement[] = [];
    sortedCols.forEach(([x, boxes]) => {
      // Reverse the X position within the bounding box
      const newX = maxX - (x - minX);
      boxes.forEach((box) => {
        splitBoxes.push({
          ...box,
          x: newX,
        });
      });
    });
    
    return {
      ...layer,
      boxes: splitBoxes,
    };
  }
  return layer;
}

function rotateLayer180(boxes: BoxPlacement[], palletLength: number, palletWidth: number): BoxPlacement[] {
  return boxes.map((box) => ({
    ...box,
    x: palletLength - box.x - box.boxWidth,
    y: palletWidth - box.y - box.boxLength,
  }));
}

function applyWeightConstraints(
  arrangement: Arrangement,
  boxWeight: number,
  pallet: Pallet
): Arrangement {
  const maxWeight = pallet.max_weight || Infinity;
  const palletWeight = pallet.pallet_weight || 0;
  const totalWeight = arrangement.totalBoxes * boxWeight + palletWeight;

  // Update box weights in all layers
  arrangement.layers.forEach((layer) => {
    layer.boxes.forEach((box) => {
      box.boxWeight = boxWeight;
    });
  });

  if (totalWeight <= maxWeight) {
    // Within weight limit
    arrangement.totalWeight = totalWeight;
    arrangement.weightUtilization = maxWeight !== Infinity ? (totalWeight / maxWeight) * 100 : 0;
    arrangement.weightLimited = false;
    return arrangement;
  }

  // Exceeds weight limit, reduce layers/boxes
  // Include complete layers, and if weight is exceeded before 1 full layer, show partial layer
  const maxBoxWeight = maxWeight - palletWeight;
  const maxBoxes = Math.floor(maxBoxWeight / boxWeight);

  let currentBoxes = 0;
  const adjustedLayers: Layer[] = [];

  for (const layer of arrangement.layers) {
    // If entire layer fits, add it
    if (currentBoxes + layer.boxes.length <= maxBoxes) {
      adjustedLayers.push(layer);
      currentBoxes += layer.boxes.length;
    } else {
      // If we haven't added any layers yet and weight is exceeded before 1 full layer,
      // include a partial layer
      const remainingBoxes = maxBoxes - currentBoxes;
      if (remainingBoxes > 0 && adjustedLayers.length === 0) {
        // First layer, show partial even if it doesn't fill completely
        adjustedLayers.push({
          ...layer,
          boxes: layer.boxes.slice(0, remainingBoxes),
        });
        currentBoxes += remainingBoxes;
      }
      // Otherwise, stop at last complete layer
      break;
    }
  }

  const finalWeight = currentBoxes * boxWeight + palletWeight;
  return {
    ...arrangement,
    layers: adjustedLayers,
    totalBoxes: currentBoxes,
    totalLayers: adjustedLayers.length,
    boxesPerLayer: adjustedLayers.map((l) => l.boxes.length),
    totalWeight: finalWeight,
    weightUtilization: (finalWeight / maxWeight) * 100,
    weightLimited: true,
  };
}
