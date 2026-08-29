import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginScreen } from '@/pages/LoginScreen';
import { MfaVerifyScreen } from '@/pages/MfaVerifyScreen';
import { MfaSetupScreen } from '@/pages/MfaSetupScreen';
import { HomeDashboard } from '@/pages/HomeDashboard';
import { ReviewQueue } from '@/pages/ReviewQueue';
import { FranchiseeDetail } from '@/pages/FranchiseeDetail';
import { FirmDetail } from '@/pages/FirmDetail';
import { SalonDetail } from '@/pages/SalonDetail';
import { FirmManagement } from '@/pages/FirmManagement';
import { SalonManagement } from '@/pages/SalonManagement';
import { AdminUserManagement } from '@/pages/AdminUserManagement';
import { AddFranchiseeWizard } from '@/pages/AddFranchiseeWizard';
import { OfficialsManagement } from '@/pages/OfficialsManagement';

function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser } = useApp();
  const location = useLocation();
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <AppLayout>{children}</AppLayout>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { currentUser } = useApp();
  if (currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectIfAuthed><LoginScreen /></RedirectIfAuthed>} />
      <Route path="/mfa/verify" element={<MfaVerifyScreen />} />
      <Route path="/mfa/setup" element={<MfaSetupScreen />} />
      <Route path="/" element={<RequireAuth><HomeDashboard /></RequireAuth>} />
      <Route path="/review" element={<RequireAuth><ReviewQueue /></RequireAuth>} />
      <Route path="/franchisee/:id" element={<RequireAuth><FranchiseeDetail /></RequireAuth>} />
      <Route path="/firms" element={<RequireAuth><FirmManagement /></RequireAuth>} />
      <Route path="/firm/:id" element={<RequireAuth><FirmDetail /></RequireAuth>} />
      <Route path="/salons" element={<RequireAuth><SalonManagement /></RequireAuth>} />
      <Route path="/salon/:id" element={<RequireAuth><SalonDetail /></RequireAuth>} />
      <Route path="/admin-users" element={<RequireAuth><AdminUserManagement /></RequireAuth>} />
      <Route path="/officials" element={<RequireAuth><OfficialsManagement /></RequireAuth>} />
      <Route path="/admin/franchisees/new" element={<RequireAuth><AddFranchiseeWizard /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
