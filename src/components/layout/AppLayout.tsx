import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  MapPinned,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Avatar, getInitials } from '@/components/ui/Avatar';

const ROYALTY_APPROVAL_ROLES = ['STATE_HEAD', 'SUPER_ADMIN', 'CORPORATE_ADMIN'];
const OFFICIAL_ROLES = ['REGIONAL_MANAGER', 'CLUSTER_MANAGER', 'STATE_HEAD'];

const navItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/review', label: 'Directory', icon: ClipboardCheck },
  { to: '/admin/franchisees/new', label: 'Add Franchisee', icon: UserPlus },
  { to: '/firms', label: 'Companies', icon: Building2 },
  { to: '/salons', label: 'Salon Management', icon: Scissors },
  { to: '/my-salons', label: 'My Salons', icon: MapPinned, roles: OFFICIAL_ROLES },
  { to: '/officials', label: 'Officials', icon: ShieldCheck },
  { to: '/royalty-approvals', label: 'Royalty Approvals', icon: Percent, roles: ROYALTY_APPROVAL_ROLES },
  { to: '/admin-users', label: 'Admin Users', icon: Users },
];

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CORPORATE_ADMIN: 'Corporate Admin',
  STATE_HEAD: 'State Head',
  REGIONAL_MANAGER: 'Regional Manager',
  CLUSTER_MANAGER: 'Cluster Manager',
};

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.some((r) => currentUser?.roles?.includes(r)),
  );

  return (
    <div className="flex min-h-screen bg-surface-base">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white border-r border-brand-100">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink leading-tight">Naturals FMS</p>
            <p className="text-xs text-ink-secondary">Admin Console</p>
          </div>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-ink">Naturals FMS</span>
        </div>
        <Avatar initials={getInitials(displayName(currentUser?.email) || 'A U')} size="sm" />
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-brand-100 flex items-center justify-around px-2 py-2">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-brand-700' : 'text-ink-secondary'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="truncate max-w-[60px]">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-16 md:pt-0 pb-16 md:pb-0">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
