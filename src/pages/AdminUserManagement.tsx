import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { UserStatusBadge } from '@/components/domain/UserStatusBadge';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { AdminUser } from '@/types';
import { roleLabels, STAFF_ROLES } from '@/lib/roles';

const roleBadgeColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-brand-600',
  CORPORATE_ADMIN: 'bg-brand-500',
  STATE_HEAD: 'bg-brand-400',
  REGIONAL_MANAGER: 'bg-amber-500',
  CLUSTER_MANAGER: 'bg-slate-500',
};

export function AdminUserManagement() {
  const { showToast } = useToast();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', role: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setAdminUsers(await api.listAdminUsers());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.role) e.role = 'Role is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      await api.createAdminUser({ email: form.email.trim(), roleName: form.role });
      showToast('success', `User created. An activation email has been sent to ${form.email.trim()}.`);
      setCreateModal(false);
      setForm({ email: '', role: '' });
      setErrors({});
      loadUsers();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Admin Users</h1>
          <p className="text-sm text-ink-secondary mt-1">Create staff logins for any role.</p>
        </div>
        <Button onClick={() => setCreateModal(true)}>
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : loadError ? (
          <EmptyState title="Couldn't load users" message={loadError} icon={<Shield className="h-8 w-8" />} />
        ) : adminUsers.length === 0 ? (
          <EmptyState
            title="No admin users yet"
            message="Users you create here will appear in this list."
            icon={<Shield className="h-8 w-8" />}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-100 bg-surface-subtle/50">
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-6 py-3">
                      Email
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar initials={getInitials(user.email)} size="sm" />
                          <span className="text-sm font-medium text-ink">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white ${roleBadgeColors[user.roleName] ?? 'bg-slate-500'}`}
                          >
                            <Shield className="h-3 w-3" />
                            {roleLabels[user.roleName] ?? user.roleName}
                          </span>
                          <UserStatusBadge status={user.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-brand-50">
              {adminUsers.map((user) => (
                <div key={user.id} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar initials={getInitials(user.email)} size="sm" />
                    <p className="text-sm font-medium text-ink truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white ${roleBadgeColors[user.roleName] ?? 'bg-slate-500'}`}
                    >
                      <Shield className="h-3 w-3" />
                      {roleLabels[user.roleName] ?? user.roleName}
                    </span>
                    <UserStatusBadge status={user.status} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Create user modal */}
      <Modal
        open={createModal}
        onClose={() => {
          setCreateModal(false);
          setForm({ email: '', role: '' });
          setErrors({});
        }}
        title="Create Admin User"
        description="Create a login for any staff role. An activation email is sent to the address given."
        primaryLabel={creating ? 'Creating...' : 'Create User'}
        primaryDisabled={!form.email || !form.role || creating}
        onPrimary={handleCreate}
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="e.g. priya.nair@naturals.in"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="">Select a role...</option>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
