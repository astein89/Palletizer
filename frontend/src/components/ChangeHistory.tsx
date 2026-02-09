import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ChangeHistory } from '../types';
import LoadingSpinner from './common/LoadingSpinner';

interface ChangeHistoryProps {
  tableName: 'pallets' | 'items';
  recordId: string;
}

export default function ChangeHistoryComponent({ tableName, recordId }: ChangeHistoryProps) {
  const [history, setHistory] = useState<ChangeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && recordId) {
      loadHistory();
    }
  }, [isOpen, recordId, tableName]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      let url = '';
      if (tableName === 'pallets') {
        url = `/pallets/${recordId}/history`;
      } else {
        const [itemId, uom, qty] = recordId.split('|');
        url = `/items/${itemId}/${uom}/${qty}/history`;
      }
      const response = await api.get<ChangeHistory[]>(url);
      setHistory(response.data);
    } catch (error) {
      toast.error('Failed to load change history');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-dark-primary hover:text-dark-primaryHover"
      >
        {isOpen ? 'Hide' : 'View'} Change History
      </button>

      {isOpen && (
        <div className="mt-4 bg-dark-surface rounded-lg p-4 border border-dark-border">
          <h4 className="font-medium mb-3 text-dark-text">Change History</h4>
          {loading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="md" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-dark-textSecondary">No change history available</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((change) => (
                <div key={change.id} className="border-l-2 border-dark-primary pl-3">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-sm font-medium text-dark-text">
                        {change.action} by {change.username || 'Unknown'}
                      </span>
                      <span className="text-xs text-dark-textSecondary ml-2">
                        {new Date(change.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {change.action === 'UPDATE' && change.changed_fields && (
                    <div className="text-xs text-dark-textSecondary mt-1">
                      Changed: {JSON.parse(change.changed_fields).join(', ')}
                    </div>
                  )}
                  {change.action === 'UPDATE' && change.old_values && change.new_values && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-dark-textSecondary hover:text-dark-text">
                        Show details
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div>
                          <div className="font-medium text-dark-textSecondary">Old Values:</div>
                          <pre className="bg-dark-surfaceHover p-2 rounded text-xs overflow-x-auto">
                            {formatValue(JSON.parse(change.old_values))}
                          </pre>
                        </div>
                        <div>
                          <div className="font-medium text-dark-textSecondary">New Values:</div>
                          <pre className="bg-dark-surfaceHover p-2 rounded text-xs overflow-x-auto">
                            {formatValue(JSON.parse(change.new_values))}
                          </pre>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
