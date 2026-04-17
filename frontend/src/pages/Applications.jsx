import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Briefcase,
  Calendar,
  MapPin,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';
import { applicationApi } from '../api';
import { ScreeningAnswers } from '../components/ScreeningAnswers';
import { toast } from 'sonner';
import { getErrorMessage } from '../utils/errorHandler';

const STATUS_OPTIONS = [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
  'ghosted',
];

const initialForm = {
  company_name: '',
  role: '',
  portal: '',
  job_title: '',
  status: 'applied',
  applied_at: '',
  location: '',
  job_description: '',
  is_remote: false,
  salary_mentioned: '',
  notes: '',
  skills_csv: '',
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const buildSkillsPayload = (skillsCsv) => {
  const list = skillsCsv
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!list.length) return null;
  return { items: list };
};

export const Applications = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState(initialForm);

  const fetchApplications = async () => {
    try {
      const { data } = await applicationApi.getAll({ page: 1, page_size: 100 });
      setApplications(data?.applications || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    const shouldOpenCreateModal = searchParams.get('open') === 'create';
    if (shouldOpenCreateModal) {
      setShowCreateModal(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('open');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const handleOpenCreateApplication = () => {
      setShowCreateModal(true);
    };

    window.addEventListener('openCreateApplication', handleOpenCreateApplication);
    return () => {
      window.removeEventListener('openCreateApplication', handleOpenCreateApplication);
    };
  }, []);

  const filteredApps = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return applications;

    return applications.filter((app) => {
      return (
        (app.company_name || '').toLowerCase().includes(query) ||
        (app.role || '').toLowerCase().includes(query) ||
        (app.job_title || '').toLowerCase().includes(query)
      );
    });
  }, [applications, searchTerm]);

  const openDetails = async (id) => {
    setIsDetailsLoading(true);
    try {
      const { data } = await applicationApi.getById(id);
      setSelectedApp(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        company_name: form.company_name.trim(),
        role: form.role.trim(),
        portal: form.portal.trim(),
        job_title: form.job_title.trim(),
        status: form.status,
        applied_at: form.applied_at ? new Date(form.applied_at).toISOString() : null,
        location: form.location.trim(),
        job_description: form.job_description.trim(),
        is_remote: Boolean(form.is_remote),
        salary_mentioned: form.salary_mentioned ? Number(form.salary_mentioned) : null,
        notes: form.notes.trim() || null,
        skills_I_mentioned: buildSkillsPayload(form.skills_csv),
      };

      await applicationApi.create(payload);
      toast.success('Application created successfully');
      setShowCreateModal(false);
      setForm(initialForm);
      navigate('/applications', { replace: true });
      setIsLoading(true);
      await fetchApplications();
      
      // Emit event to refresh dashboard
      window.dispatchEvent(new Event('refreshDashboard'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this application?')) return;

    try {
      await applicationApi.delete(id);
      toast.success('Application deleted');
      if (selectedApp?.id === id) {
        setSelectedApp(null);
      }
      setApplications((prev) => prev.filter((item) => item.id !== id));
      
      // Emit event to refresh dashboard
      window.dispatchEvent(new Event('refreshDashboard'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleStatusUpdate = async (nextStatus) => {
    if (!selectedApp?.id) return;
    try {
      await applicationApi.update(selectedApp.id, { status: nextStatus });
      toast.success('Status updated');
      setSelectedApp((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      setApplications((prev) =>
        prev.map((app) => (app.id === selectedApp.id ? { ...app, status: nextStatus } : app))
      );
      
      // Emit event to refresh dashboard
      window.dispatchEvent(new Event('refreshDashboard'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Applications</h2>
          <p className="text-slate-500">Backend-synced job applications from your API.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search company, role, or title..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Applied At</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">Loading applications...</td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No applications found.</td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    className="group hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => openDetails(app.id)}
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">{app.company_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{app.role}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-200 capitalize">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDateTime(app.applied_at || app.created_at)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {app.location || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                        onClick={(e) => handleDelete(e, app.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Create Application</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="px-3 py-2 border rounded-lg" placeholder="Company Name" value={form.company_name} onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))} required />
                <input className="px-3 py-2 border rounded-lg" placeholder="Role" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} required />
                <input className="px-3 py-2 border rounded-lg" placeholder="Portal (LinkedIn, Careers...)" value={form.portal} onChange={(e) => setForm((prev) => ({ ...prev, portal: e.target.value }))} required />
                <input className="px-3 py-2 border rounded-lg" placeholder="Job Title" value={form.job_title} onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))} required />
                <select className="px-3 py-2 border rounded-lg" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <input type="datetime-local" className="px-3 py-2 border rounded-lg" value={form.applied_at} onChange={(e) => setForm((prev) => ({ ...prev, applied_at: e.target.value }))} />
                <input className="px-3 py-2 border rounded-lg" placeholder="Location" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} required />
                <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Salary Mentioned" value={form.salary_mentioned} onChange={(e) => setForm((prev) => ({ ...prev, salary_mentioned: e.target.value }))} />
                <input className="px-3 py-2 border rounded-lg md:col-span-2" placeholder="Skills (comma separated)" value={form.skills_csv} onChange={(e) => setForm((prev) => ({ ...prev, skills_csv: e.target.value }))} />
                <textarea className="px-3 py-2 border rounded-lg md:col-span-2 min-h-24" placeholder="Job Description" value={form.job_description} onChange={(e) => setForm((prev) => ({ ...prev, job_description: e.target.value }))} required />
                <textarea className="px-3 py-2 border rounded-lg md:col-span-2 min-h-20" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.is_remote} onChange={(e) => setForm((prev) => ({ ...prev, is_remote: e.target.checked }))} />
                  Remote role
                </label>
              </div>
              <div className="p-6 border-t bg-slate-50/50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-60">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedApp(null)}>
          <div className="h-full w-full max-w-2xl bg-white shadow-2xl p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Application Details</h3>
              <button onClick={() => setSelectedApp(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isDetailsLoading ? (
              <div className="text-slate-500">Loading details...</div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg">{selectedApp.company_name}</p>
                    <p className="text-slate-500">{selectedApp.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p><span className="font-semibold">Job Title:</span> {selectedApp.job_title || '-'}</p>
                  <p><span className="font-semibold">Portal:</span> {selectedApp.portal || '-'}</p>
                  <p><span className="font-semibold">Location:</span> {selectedApp.location || '-'}</p>
                  <p><span className="font-semibold">Applied:</span> {formatDateTime(selectedApp.applied_at)}</p>
                  <p><span className="font-semibold">Salary:</span> {selectedApp.salary_mentioned || '-'}</p>
                  <p><span className="font-semibold">Remote:</span> {selectedApp.is_remote ? 'Yes' : 'No'}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <select
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    value={selectedApp.status}
                    onChange={(e) => handleStatusUpdate(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Job Description</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border">{selectedApp.job_description || '-'}</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Notes</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border">{selectedApp.notes || '-'}</p>
                </div>

                <div>
                  <ScreeningAnswers applicationId={selectedApp.id} />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Timeline</h4>
                  {(selectedApp.timeline_events || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No timeline events yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(selectedApp.timeline_events || []).map((event) => (
                        <div key={event.id} className="text-sm bg-slate-50 p-3 rounded-lg border">
                          <p className="font-medium text-slate-800">{event.event_type}</p>
                          <p className="text-slate-500 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(event.event_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
