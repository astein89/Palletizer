import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Pallet } from '../types';
import LoadingSpinner from './common/LoadingSpinner';
import ChangeHistory from './ChangeHistory';

export default function PalletManager() {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPallet, setEditingPallet] = useState<Pallet | null>(null);
  const [formData, setFormData] = useState<Partial<Pallet>>({
    name: '',
    length: 0,
    width: 0,
    height: 0,
    max_overhang: 0,
    max_height: 0,
    max_weight: undefined,
    pallet_weight: 0,
  });

  useEffect(() => {
    loadPallets();
  }, []);

  const loadPallets = async () => {
    setLoading(true);
    try {
      const response = await api.get<Pallet[]>('/pallets');
      setPallets(response.data);
    } catch (error) {
      toast.error('Failed to load pallets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPallet?.id) {
        await api.put(`/pallets/${editingPallet.id}`, formData);
        toast.success('Pallet updated');
      } else {
        await api.post('/pallets', formData);
        toast.success('Pallet created');
      }
      setShowForm(false);
      setEditingPallet(null);
      setFormData({
        name: '',
        length: 0,
        width: 0,
        height: 0,
        max_overhang: 0,
        max_height: 0,
        max_weight: undefined,
        pallet_weight: 0,
      });
      loadPallets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (pallet: Pallet) => {
    setEditingPallet(pallet);
    // Calculate overhang from max_length/max_width if not present
    const overhang = pallet.max_overhang !== undefined 
      ? pallet.max_overhang 
      : (pallet.max_length && pallet.max_width)
        ? Math.min((pallet.max_length - pallet.length) / 2, (pallet.max_width - pallet.width) / 2)
        : 0;
    setFormData({ ...pallet, max_overhang: overhang });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this pallet?')) return;
    try {
      await api.delete(`/pallets/${id}`);
      toast.success('Pallet deleted');
      loadPallets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark-text">Pallet Management</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingPallet(null);
            setFormData({
              name: '',
              length: 0,
              width: 0,
              height: 0,
              max_overhang: 0,
              max_height: 0,
              max_weight: undefined,
              pallet_weight: 0,
            });
          }}
          className="px-4 py-2 bg-dark-primary hover:bg-dark-primaryHover text-white rounded-md"
        >
          Add Pallet
        </button>
      </div>

      {showForm && (
        <div className="bg-dark-surface rounded-lg p-6 border border-dark-border">
          <h3 className="text-xl font-bold mb-4 text-dark-text">
            {editingPallet ? 'Edit Pallet' : 'New Pallet'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Length (in)</label>
                <input
                  type="number"
                  value={formData.length || ''}
                  onChange={(e) => setFormData({ ...formData, length: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Width (in)</label>
                <input
                  type="number"
                  value={formData.width || ''}
                  onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Height (in)</label>
                <input
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">
                  Max Overhang (all sides) * (in)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.max_overhang || ''}
                  onChange={(e) => setFormData({ ...formData, max_overhang: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                />
                <p className="text-xs text-dark-textSecondary mt-1">
                  Overhang allowed on each side (e.g., 1 inch = 1 inch on each side)
                </p>
                {formData.length && formData.width && formData.max_overhang !== undefined && (
                  <p className="text-xs text-dark-textSecondary mt-1">
                    Max dimensions: {(formData.length + (2 * formData.max_overhang)).toFixed(1)} × {(formData.width + (2 * formData.max_overhang)).toFixed(1)} in
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Max Height * (in)</label>
                <input
                  type="number"
                  value={formData.max_height || ''}
                  onChange={(e) => setFormData({ ...formData, max_height: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Max Weight (lbs)</label>
                <input
                  type="number"
                  value={formData.max_weight || ''}
                  onChange={(e) => setFormData({ ...formData, max_weight: Number(e.target.value) || undefined })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Pallet Weight (lbs)</label>
                <input
                  type="number"
                  value={formData.pallet_weight || ''}
                  onChange={(e) => setFormData({ ...formData, pallet_weight: Number(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-dark-primary hover:bg-dark-primaryHover text-white rounded-md"
              >
                {editingPallet ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPallet(null);
                }}
                className="px-4 py-2 bg-dark-surfaceHover hover:bg-dark-border text-dark-text rounded-md"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-dark-surface rounded-lg border border-dark-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-surfaceHover">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Dimensions</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Max Overhang / Max Size</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Max Weight</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {pallets.map((pallet) => (
              <tr key={pallet.id} className="hover:bg-dark-surfaceHover">
                <td className="px-4 py-3 text-sm text-dark-text">{pallet.name}</td>
                <td className="px-4 py-3 text-sm text-dark-textSecondary">
                  {pallet.length}×{pallet.width}×{pallet.height}
                </td>
                <td className="px-4 py-3 text-sm text-dark-textSecondary">
                  {pallet.max_overhang !== undefined ? (
                    <>
                      Overhang: {pallet.max_overhang} | Max: {pallet.max_length}×{pallet.max_width}×{pallet.max_height}
                    </>
                  ) : (
                    <>
                      {pallet.max_length}×{pallet.max_width}×{pallet.max_height}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-dark-textSecondary">
                  {pallet.max_weight ? `${pallet.max_weight} (pallet: ${pallet.pallet_weight || 0})` : 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(pallet)}
                      className="text-dark-primary hover:text-dark-primaryHover"
                    >
                      Edit
                    </button>
                    {pallet.id && (
                      <ChangeHistory tableName="pallets" recordId={pallet.id.toString()} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
