import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

export default function UserMenu() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-dark-text hover:text-dark-textSecondary"
      >
        <span>{user?.username}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-dark-surface border border-dark-border rounded-md shadow-lg z-50">
            <div className="py-1">
              <div className="px-4 py-2 text-sm text-dark-textSecondary border-b border-dark-border">
                {user?.email || user?.username}
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-dark-text hover:bg-dark-surfaceHover"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
