import { type ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  Scissors,
  Users,
  UserPlus,
  LogOut,
  Sparkles,
  ShieldCheck,
  Percent,
  Menu,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { NotificationBell } from '@/components/domain/NotificationBell';
import { ADMIN_ROLES, STAFF_ROLES, roleLabels } from '@/lib/roles';

const ROYALTY_APPROVAL_ROLES = STAFF_ROLES;

const navItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/franchisees', label: 'Franchisees', icon: ClipboardCheck },
  { to: '/franchise-creation', label: 'Add Franchisee', icon: UserPlus },
  { to: '/firms', label: 'Companies', icon: Building2 },
  { to: '/salons', label: 'Salon Management', icon: Scissors },
  { to: '/officials', label: 'Officials', icon: ShieldCheck },
  { to: '/royalty-approvals', label: 'Royalty Approvals', icon: Percent, roles: ROYALTY_APPROVAL_ROLES },
  { to: '/admin-users', label: 'Admin Users', icon: Users, roles: ADMIN_ROLES },
];

function displayName(email?: string): string {
  return email ? email.split('@')[0] : '';
}

function displayRoles(roles?: string[]): string {
  if (!roles || roles.length === 0) return '';
  return roles.map((r) => roleLabels[r] ?? r).join(', ');
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.some((r) => currentUser?.roles?.includes(r)),
  );

  // Close the drawer on every navigation so it never stays open after a link is tapped.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen bg-surface-base">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white border-r border-brand-100">
        <div className="flex items-center justify-between gap-2.5 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink leading-tight">Naturals FMS</p>
              <p className="text-xs text-ink-secondary">Admin Console</p>
            </div>
          </div>
          <NotificationBell />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-card'
                    : 'text-ink-secondary hover:bg-brand-50 hover:text-brand-700'
                }`
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Admin menu */}
        <div className="border-t border-brand-100 p-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar initials={getInitials(displayName(currentUser?.email) || 'A U')} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{currentUser?.email}</p>
              <p className="text-xs text-ink-secondary truncate">{displayRoles(currentUser?.roles)}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-secondary hover:bg-red-50 hover:text-status-rejected transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-brand-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center -ml-1.5 rounded-lg text-ink-secondary hover:bg-brand-50 hover:text-brand-700 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-ink">Naturals FMS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <Avatar initials={getInitials(displayName(currentUser?.email) || 'A U')} size="sm" />
        </div>
      </div>

      {/* Mobile nav drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="fixed inset-0 bg-ink/30 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl animate-slide-in-left">
            <div className="flex items-center justify-between gap-2.5 px-5 py-4 border-b border-brand-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink leading-tight">Naturals FMS</p>
                  <p className="text-xs text-ink-secondary">Admin Console</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-brand-50 hover:text-brand-700 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-card'
                        : 'text-ink-secondary hover:bg-brand-50 hover:text-brand-700'
                    }`
                  }
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-brand-100 p-4">
              <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                <Avatar initials={getInitials(displayName(currentUser?.email) || 'A U')} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{currentUser?.email}</p>
                  <p className="text-xs text-ink-secondary truncate">{displayRoles(currentUser?.roles)}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-ink-secondary hover:bg-red-50 hover:text-status-rejected transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-16 md:pt-0">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
