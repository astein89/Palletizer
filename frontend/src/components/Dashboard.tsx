import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import Layout from './Layout';
import PalletManager from './PalletManager';
import ItemManager from './ItemManager';
import BoxInput from './BoxInput';
import UserManager from './UserManager';
import BatchResults from './BatchResults';
import ChangePasswordModal from './Auth/ChangePasswordModal';

export default function Dashboard() {
  const { user, refreshUser } = useUser();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (user?.must_change_password) {
      setShowPasswordModal(true);
    }
  }, [user]);

  const handlePasswordChangeSuccess = async () => {
    await refreshUser();
    setShowPasswordModal(false);
  };

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<BoxInput />} />
          <Route path="/pallets" element={<PalletManager />} />
          <Route path="/items" element={<ItemManager />} />
          <Route path="/batch" element={<BatchResults />} />
          <Route path="/users" element={<UserManager />} />
        </Routes>
      </Layout>
      <ChangePasswordModal
        isOpen={showPasswordModal}
        isFirstLogin={user?.must_change_password === true}
        onSuccess={handlePasswordChangeSuccess}
      />
    </>
  );
}
