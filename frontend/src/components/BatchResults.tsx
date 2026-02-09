import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Arrangement, Pallet, Box } from '../types';
import LoadingSpinner from './common/LoadingSpinner';
import ResultsPanel from './ResultsPanel';
import PalletVisualization from './PalletVisualization';

interface BatchResult {
  row: number;
  input: any;
  arrangement: Arrangement | null;
  error?: string;
}

export default function BatchResults() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<BatchResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setProcessing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post<{ results: BatchResult[]; total: number; successful: number }>(
        '/batch',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setResults(response.data.results);
      toast.success(`Processed ${response.data.total} rows (${response.data.successful} successful)`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Batch processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-dark-surface rounded-lg p-6 border border-dark-border">
        <h2 className="text-2xl font-bold mb-6 text-dark-text">Batch Processing</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Upload CSV or XLSX File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
            />
            <div className="mt-2 space-y-2">
              <p className="text-xs text-dark-textSecondary">
                Required columns: length, width, height, weight
                <br />
                Optional columns: item_id, uom, qty, pallet_id, allow_height_rotation, allow_overhang
              </p>
              <a
                href="/example-batch.csv"
                download="example-batch.csv"
                className="text-xs text-dark-primary hover:text-dark-primaryHover underline"
                onClick={(e) => {
                  e.preventDefault();
                  // Create example CSV content
                  const csvContent = `length,width,height,weight,item_id,uom,qty,pallet_id,allow_height_rotation,allow_overhang
12,10,8,5.5,ITEM001,EA,1,1,false,true
15,12,10,7.2,ITEM002,EA,1,1,false,true
10,8,6,4.0,ITEM003,EA,1,1,true,false`;
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', 'example-batch.csv');
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(url);
                }}
              >
                Download example CSV file
              </a>
            </div>
          </div>

          <button
            onClick={handleProcess}
            disabled={processing || !file}
            className="px-4 py-2 bg-dark-primary hover:bg-dark-primaryHover text-white rounded-md disabled:opacity-50 flex items-center gap-2"
          >
            {processing ? <LoadingSpinner size="sm" /> : null}
            {processing ? 'Processing...' : 'Process File'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-dark-surface rounded-lg p-6 border border-dark-border">
          <h3 className="text-xl font-bold mb-4 text-dark-text">Results</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border cursor-pointer ${
                  result.arrangement
                    ? 'bg-dark-surfaceHover border-dark-border hover:border-dark-primary'
                    : 'bg-dark-error/20 border-dark-error'
                }`}
                onClick={() => result.arrangement && setSelectedResult(result)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-dark-text">Row {result.row}</span>
                  {result.arrangement ? (
                    <span className="text-xs text-dark-success">
                      {result.arrangement.totalBoxes} boxes, {result.arrangement.totalLayers} layers
                    </span>
                  ) : (
                    <span className="text-xs text-dark-error">{result.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedResult && selectedResult.arrangement && (
        <div className="space-y-6">
          <div className="bg-dark-surface rounded-lg p-6 border border-dark-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-dark-text">Row {selectedResult.row} Details</h3>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-dark-textSecondary hover:text-dark-text"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <ResultsPanel
                  arrangement={selectedResult.arrangement}
                  box={{
                    length: selectedResult.input.length,
                    width: selectedResult.input.width,
                    height: selectedResult.input.height,
                    weight: selectedResult.input.weight,
                  }}
                  itemInfo={
                    selectedResult.input.item_id
                      ? {
                          item_id: selectedResult.input.item_id,
                          uom: selectedResult.input.uom,
                          qty: selectedResult.input.qty,
                        }
                      : undefined
                  }
                />
              </div>
              <div>
                <h4 className="text-lg font-bold mb-4 text-dark-text">3D Visualization</h4>
                <div className="h-96 border border-dark-border rounded-lg">
                  <PalletVisualization arrangement={selectedResult.arrangement} />
                </div>
                <p className="text-xs text-dark-textSecondary mt-2">
                  Note: You can screenshot this visualization for documentation
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
