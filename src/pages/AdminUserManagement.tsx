import { useState } from 'react';
import { UserPlus, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CORPORATE_ADMIN: 'Corporate Admin',
  STATE_HEAD: 'State Head',
  REGIONAL_MANAGER: 'Regional Manager',
  CLUSTER_MANAGER: 'Cluster Manager',
};

const roleBadgeColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-brand-600',
  CORPORATE_ADMIN: 'bg-brand-500',
  STATE_HEAD: 'bg-brand-400',
  REGIONAL_MANAGER: 'bg-amber-500',
  CLUSTER_MANAGER: 'bg-slate-500',
};

const allRoles: string[] = Object.keys(roleLabels);

export function AdminUserManagement() {
  const { adminUsers, createAdminUser } = useApp();
  const { showToast } = useToast();
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.role) e.role = 'Role is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      await createAdminUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        roleName: form.role,
      });
      showToast('success', `Admin user ${form.fullName} created successfully.`);
      setCreateModal(false);
      setForm({ fullName: '', email: '', phone: '', role: '' });
      setErrors({});
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to create admin user.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Admin Users</h1>
          <p className="text-sm text-ink-secondary mt-1">
            Manage admin team members and their roles
          </p>
        </div>
        <Button onClick={() => setCreateModal(true)}>
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      {adminUsers.length === 0 && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-ink-secondary">
          The backend does not yet expose a way to list existing admin users — this table only shows users created
          from this screen during the current session.
        </div>
      )}

      <Card className="overflow-hidden">
        {adminUsers.length === 0 ? (
          <EmptyState
            title="No admin users created yet"
            message="Users you create here will appear in this list for this session."
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
                      User
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Email
                    </th>
                    <th className="text-left text-xs font-semibold text-ink-secondary uppercase tracking-wider px-3 py-3">
                      Roles
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar initials={getInitials(user.fullName)} size="sm" />
                          <span className="text-sm font-medium text-ink">{user.fullName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-ink-secondary">{user.email}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.map((role) => (
                            <span
                              key={role}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white ${roleBadgeColors[role] ?? 'bg-slate-500'}`}
                            >
                              <Shield className="h-3 w-3" />
                              {roleLabels[role] ?? role}
                            </span>
                          ))}
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
                    <Avatar initials={getInitials(user.fullName)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{user.fullName}</p>
                      <p className="text-xs text-ink-secondary truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white ${roleBadgeColors[role] ?? 'bg-slate-500'}`}
                      >
                        <Shield className="h-3 w-3" />
                        {roleLabels[role] ?? role}
                      </span>
                    ))}
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
          setForm({ fullName: '', email: '', phone: '', role: '' });
          setErrors({});
        }}
        title="Create Admin User"
        description="Add a new admin team member with a specific role."
        primaryLabel={creating ? 'Creating...' : 'Create User'}
        primaryDisabled={!form.fullName || !form.email || !form.role || creating}
        onPrimary={handleCreate}
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Priya Nair"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            error={errors.fullName}
          />
          <Input
            label="Email"
            type="email"
            placeholder="e.g. priya.nair@naturals.in"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Input
            label="Phone"
            placeholder="e.g. +91 98400 11223"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={errors.phone}
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="">Select a role...</option>
            {allRoles.map((r) => (
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
