import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import UserMenu from './Auth/UserMenu';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useUser();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Palletize' },
    { path: '/pallets', label: 'Pallets' },
    { path: '/items', label: 'Items' },
    { path: '/batch', label: 'Batch' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/users', label: 'Users' });
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <nav className="bg-dark-surface border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-dark-text">Palletizer</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname === item.path
                        ? 'border-dark-primary text-dark-text'
                        : 'border-transparent text-dark-textSecondary hover:text-dark-text hover:border-dark-border'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
