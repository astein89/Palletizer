import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Pallet, Item, Box, Arrangement } from '../types';
import LoadingSpinner from './common/LoadingSpinner';
import PalletVisualization, { PalletVisualizationHandle } from './PalletVisualization';
import ResultsPanel from './ResultsPanel';

export default function BoxInput() {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [selectedPalletId, setSelectedPalletId] = useState<number | ''>('');
  const [box, setBox] = useState<Box>({
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
    allowHeightRotation: false,
    allowOverhang: false,
    stackPattern: 'auto',
  });
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [arrangement, setArrangement] = useState<Arrangement | null>(null);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const visualizationRef = useRef<PalletVisualizationHandle>(null);
  const hasCalculatedRef = useRef(false);
  const previousStackPatternRef = useRef<Box['stackPattern']>('auto');

  useEffect(() => {
    loadPallets();
    loadItems();
  }, []);

  // Auto-calculate when stack pattern changes (only if we've already calculated once)
  useEffect(() => {
    // Skip on initial mount or if we haven't calculated before
    if (!hasCalculatedRef.current) {
      previousStackPatternRef.current = box.stackPattern;
      return;
    }

    // Skip if pattern hasn't actually changed
    if (previousStackPatternRef.current === box.stackPattern) {
      return;
    }

    // Only auto-calculate if we have valid inputs
    if (
      selectedPalletId &&
      box.length &&
      box.width &&
      box.height &&
      box.weight
    ) {
      previousStackPatternRef.current = box.stackPattern;
      handleCalculate(false); // Don't show toast for auto-calculations
    } else {
      // Update ref even if we can't calculate yet
      previousStackPatternRef.current = box.stackPattern;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.stackPattern]);

  const loadPallets = async () => {
    try {
      const response = await api.get<Pallet[]>('/pallets');
      setPallets(response.data);
    } catch (error) {
      toast.error('Failed to load pallets');
    }
  };

  const loadItems = async () => {
    try {
      const response = await api.get<Item[]>('/items');
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to load items');
    }
  };

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setBox({
      length: item.length,
      width: item.width,
      height: item.height,
      weight: item.weight,
      allowHeightRotation: item.allow_height_rotation || false,
      allowOverhang: item.allow_overhang !== undefined ? item.allow_overhang : false,
      stackPattern: box.stackPattern || 'auto',
    });
  };

  const handleCalculate = async (showToast: boolean = true) => {
    if (!selectedPalletId) {
      if (showToast) toast.error('Please select a pallet');
      return;
    }

    if (!box.length || !box.width || !box.height || !box.weight) {
      if (showToast) toast.error('Please enter all box dimensions and weight');
      return;
    }

    setCalculating(true);
    try {
      const response = await api.post<Arrangement>('/palletize', {
        palletId: selectedPalletId,
        box,
      });
      setArrangement(response.data);
      
      // Get the selected pallet for export
      const pallet = pallets.find(p => p.id === selectedPalletId);
      if (pallet) setSelectedPallet(pallet);
      
      // Mark that we've calculated at least once
      hasCalculatedRef.current = true;
      previousStackPatternRef.current = box.stackPattern;
      
      if (showToast) toast.success('Calculation complete');
    } catch (error: any) {
      if (showToast) toast.error(error.response?.data?.error || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-dark-text">Palletize Calculator</h2>

      {/* Box Information - Full width at top */}
      <div className="bg-dark-surface rounded-lg p-6 border border-dark-border">
        <h3 className="text-lg font-bold mb-4 text-dark-text">Box Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Pallet Type *
            </label>
            <select
              value={selectedPalletId}
              onChange={(e) => setSelectedPalletId(Number(e.target.value) || '')}
              className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-primary"
            >
              <option value="">Select a pallet...</option>
              {pallets.map((pallet) => (
                  <option key={pallet.id} value={pallet.id}>
                    {pallet.name} ({pallet.max_length}×{pallet.max_width}×{pallet.max_height} in)
                  </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Item (Optional)
            </label>
            <select
              value={selectedItem ? `${selectedItem.item_id}|${selectedItem.uom}|${selectedItem.qty}` : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [itemId, uom, qty] = e.target.value.split('|');
                  const item = items.find(
                    (i) => i.item_id === itemId && i.uom === uom && i.qty === Number(qty)
                  );
                  if (item) handleItemSelect(item);
                } else {
                  setSelectedItem(null);
                }
              }}
              className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-primary"
            >
              <option value="">Select an item...</option>
              {items.map((item) => (
                <option
                  key={`${item.item_id}-${item.uom}-${item.qty}`}
                  value={`${item.item_id}|${item.uom}|${item.qty}`}
                >
                  {item.item_id} - {item.uom} - {item.qty} ({item.length}×{item.width}×{item.height} in)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Length * (in)
            </label>
            <input
              type="number"
              value={box.length || ''}
              onChange={(e) => setBox({ ...box, length: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Width * (in)
            </label>
            <input
              type="number"
              value={box.width || ''}
              onChange={(e) => setBox({ ...box, width: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Height * (in)
            </label>
            <input
              type="number"
              value={box.height || ''}
              onChange={(e) => setBox({ ...box, height: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Weight * (lbs)
            </label>
            <input
              type="number"
              value={box.weight || ''}
              onChange={(e) => setBox({ ...box, weight: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-primary"
              required
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-dark-border">
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Stack Pattern
              {arrangement && arrangement.stackPattern && (
                <span className="ml-2 text-xs text-dark-textSecondary">
                  (Using: {arrangement.stackPattern === 'auto' ? 'Auto' : 
                    arrangement.stackPattern === 'block' ? 'Block' :
                    arrangement.stackPattern === 'brick' ? 'Brick' :
                    arrangement.stackPattern === 'pinwheel' ? 'Pinwheel' :
                    arrangement.stackPattern === 'row' ? 'Row' : arrangement.stackPattern})
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { 
                  value: 'auto', 
                  label: 'Auto', 
                  tooltip: 'Automatically select the most optimal pattern',
                  color: 'bg-blue-600 hover:bg-blue-700'
                },
                { 
                  value: 'block', 
                  label: 'Block', 
                  tooltip: 'All layers identical, no rotation or offset',
                  color: 'bg-indigo-600 hover:bg-indigo-700'
                },
                { 
                  value: 'brick', 
                  label: 'Brick', 
                  tooltip: 'Each layer offset by half box length',
                  color: 'bg-orange-600 hover:bg-orange-700'
                },
                { 
                  value: 'pinwheel', 
                  label: 'Pinwheel', 
                  tooltip: 'Each layer rotated 90° from previous for stability',
                  color: 'bg-green-600 hover:bg-green-700'
                },
                { 
                  value: 'row', 
                  label: 'Row', 
                  tooltip: 'Rows alternate direction between layers',
                  color: 'bg-cyan-600 hover:bg-cyan-700'
                },
              ].map((pattern) => {
                const isSelected = box.stackPattern === pattern.value;
                const isUsed = arrangement && arrangement.stackPattern === pattern.value;
                return (
                  <button
                    key={pattern.value}
                    type="button"
                    onClick={() => setBox({ ...box, stackPattern: pattern.value as Box['stackPattern'] })}
                    title={pattern.tooltip}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors relative ${
                      isSelected
                        ? `${pattern.color} text-white`
                        : isUsed
                        ? `${pattern.color} text-white opacity-70 border-2 border-yellow-400`
                        : 'bg-dark-surfaceHover text-dark-textSecondary hover:bg-dark-border hover:text-dark-text'
                    }`}
                  >
                    {pattern.label}
                    {isUsed && !isSelected && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-dark-border"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowHeightRotation"
                  checked={box.allowHeightRotation || false}
                  onChange={(e) => setBox({ ...box, allowHeightRotation: e.target.checked })}
                  className="w-4 h-4 text-dark-primary bg-dark-surface border-dark-border rounded focus:ring-dark-primary"
                />
                <label htmlFor="allowHeightRotation" className="ml-2 text-sm text-dark-textSecondary">
                  Allow height rotation
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowOverhang"
                  checked={box.allowOverhang !== undefined ? box.allowOverhang : true}
                  onChange={(e) => setBox({ ...box, allowOverhang: e.target.checked })}
                  className="w-4 h-4 text-dark-primary bg-dark-surface border-dark-border rounded focus:ring-dark-primary"
                />
                <label htmlFor="allowOverhang" className="ml-2 text-sm text-dark-textSecondary">
                  Allow overhang
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCalculate}
                disabled={calculating || !selectedPalletId}
                className="px-6 py-2 bg-dark-primary hover:bg-dark-primaryHover text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {calculating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Calculating...
                  </>
                ) : (
                  'Calculate'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results and Visualization - Side by side below */}
      {arrangement && selectedPallet ? (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Results Panel - Smaller (2 columns) */}
          <div className="xl:col-span-2 bg-dark-surface rounded-lg p-4 border border-dark-border">
            <ResultsPanel 
              arrangement={arrangement} 
              pallet={selectedPallet}
              box={box}
              itemInfo={selectedItem ? {
                item_id: selectedItem.item_id,
                uom: selectedItem.uom,
                qty: selectedItem.qty,
                name: selectedItem.name
              } : undefined}
              onCaptureImages={async () => {
                if (visualizationRef.current) {
                  return await visualizationRef.current.captureImages(800, 600);
                }
                return null;
              }}
            />
          </div>

          {/* 3D Visualization - Larger (3 columns) */}
          <div className="xl:col-span-3 bg-dark-surface rounded-lg p-6 border border-dark-border">
            <PalletVisualization 
              ref={visualizationRef}
              arrangement={arrangement}
              palletDimensions={{
                length: selectedPallet.length,
                width: selectedPallet.width,
                height: selectedPallet.height,
                max_length: selectedPallet.max_length,
                max_width: selectedPallet.max_width,
                max_height: selectedPallet.max_height,
                max_overhang: selectedPallet.max_overhang
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 bg-dark-surface rounded-lg border border-dark-border">
          <p className="text-dark-textSecondary">Calculate a palletizing arrangement to see results</p>
        </div>
      )}
    </div>
  );
}
