import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginScreen } from '@/pages/LoginScreen';
import { ForgotPasswordScreen } from '@/pages/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/pages/ResetPasswordScreen';
import { ActivateAccountScreen } from '@/pages/ActivateAccountScreen';
import { MfaVerifyScreen } from '@/pages/MfaVerifyScreen';
import { MfaSetupScreen } from '@/pages/MfaSetupScreen';
import { ForceChangePasswordScreen } from '@/pages/ForceChangePasswordScreen';
import { HomeDashboard } from '@/pages/HomeDashboard';
import { FranchiseeManagement } from '@/pages/FranchiseeManagement';
import { FranchiseeDetail } from '@/pages/FranchiseeDetail';
import { FirmDetail } from '@/pages/FirmDetail';
import { SalonDetail } from '@/pages/SalonDetail';
import { FirmManagement } from '@/pages/FirmManagement';
import { SalonManagement } from '@/pages/SalonManagement';
import { AdminUserManagement } from '@/pages/AdminUserManagement';
import { OfficialsManagement } from '@/pages/OfficialsManagement';
import { RoyaltyApprovals } from '@/pages/RoyaltyApprovals';
import { FranchiseCreationDraftList } from '@/pages/FranchiseCreationDraftList';
import { FranchiseCreationWizard } from '@/pages/FranchiseCreationWizard';
import { RequireRole } from '@/components/routing/RequireRole';
import { ErrorBoundary } from '@/components/routing/ErrorBoundary';
import { STAFF_ROLES, ADMIN_ROLES } from '@/lib/roles';

const ROYALTY_APPROVAL_ROLES = ['STATE_HEAD', ...ADMIN_ROLES];

function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser, mustChangePassword, authInitializing } = useApp();
  const location = useLocation();
  if (authInitializing) return null;
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  // Blocks every route behind RequireAuth until resolved, per spec §0.2.6.
  if (mustChangePassword) {
    return <ForceChangePasswordScreen />;
  }
  return <AppLayout>{children}</AppLayout>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { currentUser, authInitializing } = useApp();
  if (authInitializing) return null;
  if (currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectIfAuthed><LoginScreen /></RedirectIfAuthed>} />
      <Route path="/forgot-password" element={<RedirectIfAuthed><ForgotPasswordScreen /></RedirectIfAuthed>} />
      <Route path="/reset-password" element={<RedirectIfAuthed><ResetPasswordScreen /></RedirectIfAuthed>} />
      {/* Deliberately NOT wrapped in RedirectIfAuthed: the activation token, not the
          current session, is the source of authority here. A leftover session in
          this browser (e.g. the admin who created the account, or a shared machine)
          must not bounce the visitor to the dashboard before they can activate. */}
      <Route path="/activate" element={<ActivateAccountScreen />} />
      <Route path="/mfa/verify" element={<MfaVerifyScreen />} />
      <Route path="/mfa/setup" element={<MfaSetupScreen />} />
      <Route path="/" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><HomeDashboard /></RequireRole></RequireAuth>} />
      <Route path="/franchisees" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><FranchiseeManagement /></RequireRole></RequireAuth>} />
      <Route path="/franchisee/:id" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><FranchiseeDetail /></RequireRole></RequireAuth>} />
      <Route path="/firms" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><FirmManagement /></RequireRole></RequireAuth>} />
      <Route path="/firm/:id" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><FirmDetail /></RequireRole></RequireAuth>} />
      <Route path="/salons" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><SalonManagement /></RequireRole></RequireAuth>} />
      <Route path="/salon/:id" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><SalonDetail /></RequireRole></RequireAuth>} />
      <Route path="/admin-users" element={<RequireAuth><RequireRole roles={ADMIN_ROLES}><AdminUserManagement /></RequireRole></RequireAuth>} />
      <Route path="/officials" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><OfficialsManagement /></RequireRole></RequireAuth>} />
      <Route path="/royalty-approvals" element={<RequireAuth><RequireRole roles={ROYALTY_APPROVAL_ROLES}><RoyaltyApprovals /></RequireRole></RequireAuth>} />
      <Route path="/franchise-creation" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><FranchiseCreationDraftList /></RequireRole></RequireAuth>} />
      <Route path="/franchise-creation/new" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><FranchiseCreationWizard /></RequireRole></RequireAuth>} />
      <Route path="/franchise-creation/:id" element={<RequireAuth><RequireRole roles={STAFF_ROLES}><FranchiseCreationWizard /></RequireRole></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
