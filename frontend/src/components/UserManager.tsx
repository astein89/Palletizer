import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { User } from '../types';
import LoadingSpinner from './common/LoadingSpinner';
import ChangeHistory from './ChangeHistory';

export default function UserManager() {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User & { password: string }>>({
    username: '',
    email: '',
    role: 'user',
    password: '',
  });

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadUsers();
    }
  }, [currentUser]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get<User[]>('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser?.id) {
        await api.put(`/users/${editingUser.id}`, formData);
        toast.success('User updated');
      } else {
        await api.post('/users', formData);
        toast.success('User created');
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        role: 'user',
        password: '',
      });
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || '',
      role: user.role,
      password: '', // Don't pre-fill password
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!confirm('Reset this user\'s password? They will be required to change it on next login.')) return;
    try {
      await api.put(`/users/${userId}`, { password: 'temp123' }); // Temporary password
      toast.success('Password reset. User must change password on next login.');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Reset failed');
    }
  };

  if (currentUser?.role !== 'admin') {
    return <div className="text-dark-text">Access denied. Admin only.</div>;
  }

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
        <h2 className="text-2xl font-bold text-dark-text">User Management</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingUser(null);
            setFormData({
              username: '',
              email: '',
              role: 'user',
              password: '',
            });
          }}
          className="px-4 py-2 bg-dark-primary hover:bg-dark-primaryHover text-white rounded-md"
        >
          Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-dark-surface rounded-lg p-6 border border-dark-border">
          <h3 className="text-xl font-bold mb-4 text-dark-text">
            {editingUser ? 'Edit User' : 'New User'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-textSecondary mb-2">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                  required
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-dark-textSecondary mb-2">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
                    required={!editingUser}
                    minLength={6}
                  />
                  <p className="text-xs text-dark-textSecondary mt-1">Minimum 6 characters</p>
                </div>
              )}
            </div>
            {editingUser && (
              <div className="text-sm text-dark-textSecondary">
                Leave password blank to keep current password. Use "Reset Password" button to force password change.
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-dark-primary hover:bg-dark-primaryHover text-white rounded-md"
              >
                {editingUser ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
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
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Username</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Last Login</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-dark-text">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-dark-surfaceHover">
                <td className="px-4 py-3 text-sm text-dark-text">{user.username}</td>
                <td className="px-4 py-3 text-sm text-dark-textSecondary">{user.email || 'N/A'}</td>
                <td className="px-4 py-3 text-sm text-dark-textSecondary">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.role === 'admin' ? 'bg-dark-primary/20 text-dark-primary' : 'bg-dark-textSecondary/20 text-dark-textSecondary'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {user.must_change_password ? (
                    <span className="px-2 py-1 rounded text-xs bg-dark-warning/20 text-dark-warning">
                      Must Change Password
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-dark-success/20 text-dark-success">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-dark-textSecondary">
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-dark-primary hover:text-dark-primaryHover"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      className="text-dark-textSecondary hover:text-dark-text"
                    >
                      Reset Password
                    </button>
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-dark-error hover:text-dark-errorHover"
                      >
                        Delete
                      </button>
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
