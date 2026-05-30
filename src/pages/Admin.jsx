import React, { useEffect, useState } from 'react';
import { Users, Shield, Search, Save, UserPlus, Trash2, Activity, ShieldAlert } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DashSelect from '../components/ui/DashSelect.jsx';
import { api } from '../services/api/api.js';

const Admin = () => {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('all');
  const [status, setStatus] = useState('all');
  const [saving, setSaving] = useState('');
  const [admins, setAdmins] = useState([]);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('admin');
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [providerSla, setProviderSla] = useState([]);
  const [errorSummary, setErrorSummary] = useState([]);
  const [jobHealth, setJobHealth] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const load = async () => {
    setError('');
    try {
      const [o, u, a, p, es, jobs, inc] = await Promise.all([
        api.admin.getOverview(),
        api.admin.getUsers({ q, tier, status }),
        api.admin.getAdmins(),
        api.admin.getProviderSla(),
        api.admin.getErrorSummary(),
        api.admin.getJobHealth(),
        api.admin.getIncidents(),
      ]);
      if (o?.success) setOverview(o.data);
      if (u?.success) setUsers(u.data || []);
      if (a?.success) setAdmins(a.data || []);
      if (p?.success) setProviderSla(p.data || []);
      if (es?.success) setErrorSummary(es.data || []);
      if (jobs?.success) setJobHealth(jobs.data || []);
      if (inc?.success) setIncidents(inc.data || []);
      if (
        o?.success === false ||
        u?.success === false ||
        a?.success === false ||
        p?.success === false ||
        es?.success === false ||
        jobs?.success === false ||
        inc?.success === false
      ) {
        setError(o?.error || u?.error || a?.error || p?.error || es?.error || jobs?.error || inc?.error || 'Could not load admin data.');
      }
    } catch (e) {
      setError(e.error || 'Admin access required or API offline.');
      setUsers([]);
      setAdmins([]);
      setProviderSla([]);
      setErrorSummary([]);
      setJobHealth([]);
      setIncidents([]);
    }
  };

  useEffect(() => {
    load();
  }, [tier, status]);

  const saveUser = async (user) => {
    setSaving(user.id);
    try {
      await api.admin.updateSubscription(user.id, {
        tier: user.tier,
        subscription_status: user.subscription_status,
        billing_cycle: user.billing_cycle || null,
      });
    } catch {
      setError('Could not save user update.');
    } finally {
      setSaving('');
      load();
    }
  };

  const updateIncident = async (id, nextStatus) => {
    setSavingAdmin(true);
    setError('');
    try {
      const res = await api.admin.updateIncident(id, { status: nextStatus });
      if (!res?.success) {
        setError(res?.error || 'Could not update incident.');
        return;
      }
      await load();
    } catch (e) {
      setError(e.error || 'Could not update incident.');
    } finally {
      setSavingAdmin(false);
    }
  };

  const addAdmin = async () => {
    if (!adminEmail.trim()) return;
    setSavingAdmin(true);
    setError('');
    try {
      const res = await api.admin.addAdmin({ email: adminEmail, role: adminRole });
      if (!res?.success) {
        setError(res?.error || 'Could not add admin.');
        return;
      }
      setAdminEmail('');
      setAdminRole('admin');
      await load();
    } catch (e) {
      setError(e.error || 'Could not add admin.');
    } finally {
      setSavingAdmin(false);
    }
  };

  const removeAdmin = async (email) => {
    setSavingAdmin(true);
    setError('');
    try {
      const res = await api.admin.removeAdmin(email);
      if (!res?.success) {
        setError(res?.error || 'Could not remove admin.');
        return;
      }
      await load();
    } catch (e) {
      setError(e.error || 'Could not remove admin.');
    } finally {
      setSavingAdmin(false);
    }
  };

  return (
    <div className="dash-page max-w-7xl mx-auto space-y-6 pb-10">
      <PageHeader
        icon={Shield}
        title="Admin Control Center"
        description="Manage users, subscriptions, and plan status."
      />

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {[
          ['Total users', overview?.total],
          ['Onboarded', overview?.onboarded],
          ['Active', overview?.active],
          ['Trialing', overview?.trialing],
          ['Pro', overview?.pro],
          ['Elite', overview?.elite],
          ['Admins', overview?.admin_count],
        ].map(([label, value]) => (
          <div key={label} className="dash-stat p-4">
            <div className="dash-stat__label">{label}</div>
            <div className="dash-stat__value text-xl">{value ?? '—'}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dash-panel">
          <div className="dash-panel__body space-y-3">
            <h3 className="font-semibold">Provider SLA Board</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-text-muted border-b border-border/60">
                  <tr>
                    <th className="px-3 py-2 text-left">Provider</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Latency</th>
                    <th className="px-3 py-2 text-left">Error rate</th>
                  </tr>
                </thead>
                <tbody>
                  {providerSla.slice(0, 8).map((r, idx) => (
                    <tr key={`${r.provider}-${idx}`} className="border-b border-border/40">
                      <td className="px-3 py-2">{r.provider}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2">{r.latency_ms ?? '—'}ms</td>
                      <td className="px-3 py-2">{r.error_rate ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel__body space-y-3">
            <h3 className="font-semibold">Error Aggregation</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-text-muted border-b border-border/60">
                  <tr>
                    <th className="px-3 py-2 text-left">Level</th>
                    <th className="px-3 py-2 text-left">Message</th>
                    <th className="px-3 py-2 text-left">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {errorSummary.slice(0, 8).map((r, idx) => (
                    <tr key={`${r.level}-${idx}`} className="border-b border-border/40">
                      <td className="px-3 py-2">{r.level}</td>
                      <td className="px-3 py-2">{r.message}</td>
                      <td className="px-3 py-2">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-panel">
        <div className="dash-panel__body space-y-3">
          <h3 className="font-semibold">Incident Console</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-text-muted border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Severity</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.slice(0, 20).map((r) => (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="px-3 py-2">{r.title}</td>
                    <td className="px-3 py-2">{r.severity}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2 text-right">
                      {r.status !== 'acknowledged' && (
                        <button
                          type="button"
                          className="btn-ghost text-xs px-2 py-1 mr-2"
                          onClick={() => updateIncident(r.id, 'acknowledged')}
                          disabled={savingAdmin}
                        >
                          Ack
                        </button>
                      )}
                      {r.status !== 'resolved' && (
                        <button
                          type="button"
                          className="btn-ghost text-xs px-2 py-1"
                          onClick={() => updateIncident(r.id, 'resolved')}
                          disabled={savingAdmin}
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-text-muted" colSpan={4}>
                      No incidents logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dash-panel">
        <div className="dash-panel__body space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} />
            <h3 className="font-semibold">Admin Rescue Team</h3>
          </div>
          <p className="text-sm text-text-muted">
            Supervise platform access and assign admin responders for incidents.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="dash-field min-w-[280px]">
              <label className="dash-field__label">Admin email</label>
              <input
                className="dash-input"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@domain.com"
              />
            </div>
            <DashSelect
              label="Role"
              value={adminRole}
              onChange={(e) => setAdminRole(e.target.value)}
              options={[
                { value: 'super_admin', label: 'super_admin' },
                { value: 'admin', label: 'admin' },
                { value: 'support_admin', label: 'support_admin' },
              ]}
              wrapperClassName="min-w-[190px]"
            />
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"
              disabled={savingAdmin}
              onClick={addAdmin}
            >
              <UserPlus size={14} />
              {savingAdmin ? 'Saving...' : 'Add admin'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-text-muted border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Source</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.email} className="border-b border-border/40">
                    <td className="px-3 py-2">{a.email}</td>
                    <td className="px-3 py-2">{a.role}</td>
                    <td className="px-3 py-2 text-text-muted">{a.source}</td>
                    <td className="px-3 py-2 text-right">
                      {a.source === 'db' ? (
                        <button
                          type="button"
                          className="btn-ghost text-xs px-3 py-1 inline-flex items-center gap-1"
                          onClick={() => removeAdmin(a.email)}
                          disabled={savingAdmin}
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      ) : (
                        <span className="text-xs text-text-muted">env managed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-text-muted" colSpan={4}>
                      No admins configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dash-panel">
        <div className="dash-panel__body space-y-4">
          <div className="flex items-center gap-2">
            <Activity size={16} />
            <h3 className="font-semibold">User and Subscription Monitoring</h3>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="dash-field min-w-[260px]">
              <label className="dash-field__label">Search user</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="email or name"
                  className="dash-input pl-9"
                />
              </div>
            </div>

            <DashSelect
              label="Tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              options={[
                { value: 'all', label: 'All tiers' },
                { value: 'free', label: 'Free' },
                { value: 'pro', label: 'Pro' },
                { value: 'elite', label: 'Elite' },
              ]}
              wrapperClassName="min-w-[170px]"
            />

            <DashSelect
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'none', label: 'None' },
                { value: 'trialing', label: 'Trialing' },
                { value: 'active', label: 'Active' },
                { value: 'past_due', label: 'Past due' },
                { value: 'canceled', label: 'Canceled' },
              ]}
              wrapperClassName="min-w-[170px]"
            />

            <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={load}>
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-text-muted border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Tier</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Cycle</th>
                  <th className="px-3 py-2 text-left">Trial ends</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/40">
                    <td className="px-3 py-2">
                      <p className="font-medium">{u.full_name || '—'}</p>
                      <p className="text-xs text-text-muted">{u.email}</p>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="dash-input py-1"
                        value={u.tier}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((x) => (x.id === u.id ? { ...x, tier: e.target.value } : x)),
                          )
                        }
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                        <option value="elite">elite</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="dash-input py-1"
                        value={u.subscription_status}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((x) =>
                              x.id === u.id ? { ...x, subscription_status: e.target.value } : x,
                            ),
                          )
                        }
                      >
                        <option value="none">none</option>
                        <option value="trialing">trialing</option>
                        <option value="active">active</option>
                        <option value="past_due">past_due</option>
                        <option value="canceled">canceled</option>
                        <option value="trial_expired">trial_expired</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{u.billing_cycle || '—'}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="btn-ghost text-xs px-3 py-1 inline-flex items-center gap-1"
                        onClick={() => saveUser(u)}
                        disabled={saving === u.id}
                      >
                        <Save size={12} />
                        {saving === u.id ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-text-muted" colSpan={6}>
                      <Users className="mx-auto mb-2 opacity-60" size={18} />
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
