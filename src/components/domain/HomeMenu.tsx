import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  Scissors,
  Users,
  UserPlus,
  ShieldCheck,
  Percent,
  LogOut,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ADMIN_ROLES, STAFF_ROLES } from '@/lib/roles';

const menuItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/franchisees', label: 'Franchisees', icon: ClipboardCheck },
  { to: '/franchise-creation', label: 'Add Franchisee', icon: UserPlus },
  { to: '/firms', label: 'Companies', icon: Building2 },
  { to: '/salons', label: 'Salon Management', icon: Scissors },
  { to: '/officials', label: 'Officials', icon: ShieldCheck },
  { to: '/royalty-approvals', label: 'Royalty Approvals', icon: Percent, roles: STAFF_ROLES },
  { to: '/admin-users', label: 'Admin Users', icon: Users, roles: ADMIN_ROLES },
];

/** Quick-access menu for the home page — mirrors the sidebar's links and also
 * surfaces logout, which is otherwise only reachable from the desktop sidebar. */
export function HomeMenu() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const visibleItems = menuItems.filter(
    (item) => !item.roles || item.roles.some((r) => currentUser?.roles?.includes(r)),
  );

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 ${
          open
            ? 'bg-gradient-to-br from-brand-600 to-brand-400 border-transparent text-white shadow-card'
            : 'bg-white border-brand-200 text-ink-secondary hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300'
        }`}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 origin-top-right rounded-2xl border border-brand-100 bg-white p-2 shadow-card-hover animate-in fade-in slide-in-from-top-1 duration-150">
          <nav className="space-y-0.5">
            {visibleItems.map((item) => (
              <button
                key={item.to}
                onClick={() => {
                  setOpen(false);
                  navigate(item.to);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-secondary transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="my-2 border-t border-brand-100" />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-secondary transition-colors hover:bg-red-50 hover:text-status-rejected"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
