import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';

interface ChangePasswordModalProps {
  isOpen: boolean;
  isFirstLogin: boolean;
  onSuccess: () => void;
}

export default function ChangePasswordModal({ isOpen, isFirstLogin, onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!isFirstLogin && !currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword: currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-surface rounded-lg p-6 border border-dark-border w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-dark-text">
          {isFirstLogin ? 'Change Your Password' : 'Change Password'}
        </h2>
        {isFirstLogin && (
          <div className="mb-4 p-3 bg-dark-warning/20 border border-dark-warning rounded-md text-dark-warning text-sm">
            You must change your password before continuing.
          </div>
        )}
         <form onSubmit={handleSubmit} className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-dark-textSecondary mb-2">
               Current Password *
             </label>
             <input
               type="password"
               value={currentPassword}
               onChange={(e) => setCurrentPassword(e.target.value)}
               required
               className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
               placeholder={isFirstLogin ? "Enter the password you just used to log in" : ""}
             />
             {isFirstLogin && (
               <p className="text-xs text-dark-textSecondary mt-1">
                 Enter the password you used to log in
               </p>
             )}
           </div>
          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
            />
            <p className="text-xs text-dark-textSecondary mt-1">Minimum 6 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-md text-dark-text"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-dark-primary hover:bg-dark-primaryHover text-white rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : null}
              Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
