import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Item } from '../types';
import LoadingSpinner from './common/LoadingSpinner';
import ChangeHistory from './ChangeHistory';

export default function ItemManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<Partial<Item>>({
    item_id: '',
    uom: '',
    qty: 0,
    name: '',
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
    description: '',
    allow_height_rotation: false,
    allow_overhang: true,
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await api.get<Item[]>('/items');
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/items', formData);
      toast.success(editingItem ? 'Item updated' : 'Item created');
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        item_id: '',
        uom: '',
        qty: 0,
        name: '',
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        description: '',
        allow_height_rotation: false,
        allow_overhang: true,
      });
      loadItems();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
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
        <h2 className="text-2xl font-bold text-dark-text">Item Management</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingItem(null);
            setFormData({
              item_id: '',
              uom: '',
              qty: 0,
              name: '',
              length: 0,
              width: 0,
              height: 0,
              weight: 0,
              description: '',
              allow_height_rotation: false,
            });
          }}
          className="px-4 py-2 bg-dark-primary hover:bg-dark-primaryHover text-white rounded-md"
        >
          Add Item
        </button>
      </div>

      {showForm && (
        <div className="bg-dark-surface rounded-lg p-6 border border-dark-border">
          <h3 className="text-xl font-bold mb-4 text-dark-text">
            {editingItem ? 'Edit Item' : 'New Item'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Item ID *</label>
                <input
                  type="text"
                  value={formData.item_id}
                  onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">UOM *</label>
                <input
                  type="text"
                  value={formData.uom}
                  onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Qty *</label>
                <input
                  type="number"
                  value={formData.qty || ''}
                  onChange={(e) => setFormData({ ...formData, qty: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-textSecondary mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Length * (in)</label>
                <input
                  type="number"
                  value={formData.length || ''}
                  onChange={(e) => setFormData({ ...formData, length: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Width * (in)</label>
                <input
                  type="number"
                  value={formData.width || ''}
                  onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Height * (in)</label>
                <input
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-textSecondary mb-2">Weight * (lbs)</label>
              <input
                type="number"
                value={formData.weight || ''}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                required
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowHeightRotation"
                checked={formData.allow_height_rotation || false}
                onChange={(e) => setFormData({ ...formData, allow_height_rotation: e.target.checked })}
                className="w-4 h-4 text-dark-primary bg-dark-surface border-dark-border rounded"
              />
              <label htmlFor="allowHeightRotation" className="ml-2 text-sm text-dark-textSecondary">
                Allow height rotation
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowOverhang"
                checked={formData.allow_overhang !== undefined ? formData.allow_overhang : true}
                onChange={(e) => setFormData({ ...formData, allow_overhang: e.target.checked })}
                className="w-4 h-4 text-dark-primary bg-dark-surface border-dark-border rounded"
              />
              <label htmlFor="allowOverhang" className="ml-2 text-sm text-dark-textSecondary">
                Allow overhang
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-dark-primary hover:bg-dark-primaryHover text-white rounded-md"
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
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
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Item ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">UOM</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Qty</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Dimensions</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Weight</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {items.map((item) => (
              <tr key={`${item.item_id}-${item.uom}-${item.qty}`} className="hover:bg-dark-surfaceHover">
                <td className="px-4 py-3 text-sm text-dark-text">{item.item_id}</td>
                <td className="px-4 py-3 text-sm text-dark-textSecondary">{item.uom}</td>
                <td className="px-4 py-3 text-sm text-dark-textSecondary">{item.qty}</td>
                <td className="px-4 py-3 text-sm text-dark-textSecondary">
                  {item.length}×{item.width}×{item.height} in
                </td>
                <td className="px-4 py-3 text-sm text-dark-textSecondary">{item.weight} lbs</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-dark-primary hover:text-dark-primaryHover"
                    >
                      Edit
                    </button>
                    <ChangeHistory
                      tableName="items"
                      recordId={`${item.item_id}|${item.uom}|${item.qty}`}
                    />
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
