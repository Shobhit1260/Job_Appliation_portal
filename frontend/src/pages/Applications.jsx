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
import { formatIndiaDateTime } from '../utils/dateTime';

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
  const [showTimelineEditModal, setShowTimelineEditModal] = useState(false);
  const [editingTimelineEvent, setEditingTimelineEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState(initialForm);
  const [timelineTitle, setTimelineTitle] = useState('');

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

    const previousStatus = selectedApp.status;
    setSelectedApp((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    setApplications((prev) =>
      prev.map((app) => (app.id === selectedApp.id ? { ...app, status: nextStatus } : app))
    );

    try {
      await applicationApi.update(selectedApp.id, { status: nextStatus });
      toast.success('Status updated');
      
      // Emit event to refresh dashboard
      window.dispatchEvent(new Event('refreshDashboard'));
    } catch (error) {
      setSelectedApp((prev) => (prev ? { ...prev, status: previousStatus } : prev));
      setApplications((prev) =>
        prev.map((app) => (app.id === selectedApp.id ? { ...app, status: previousStatus } : app))
      );
      toast.error(getErrorMessage(error));
    }
  };

  const handleEditTimelineEvent = (event) => {
    setEditingTimelineEvent(event);
    setTimelineTitle(event.title || event.event_type.replace(/_/g, ' '));
    setShowTimelineEditModal(true);
  };

  const handleSaveTimelineEvent = async (e) => {
    e.preventDefault();
    if (!editingTimelineEvent?.id) return;

    try {
      const { data } = await applicationApi.updateTimelineEvent(editingTimelineEvent.id, {
        title: timelineTitle,
      });

      setSelectedApp((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timeline_events: (prev.timeline_events || []).map((event) =>
            event.id === editingTimelineEvent.id
              ? { ...event, title: data?.event?.title || timelineTitle }
              : event
          ),
        };
      });

      toast.success('Timeline event updated');
      setEditingTimelineEvent((prev) =>
        prev ? { ...prev, title: data?.event?.title || timelineTitle } : prev
      );
      setTimelineTitle(data?.event?.title || timelineTitle);
      window.dispatchEvent(new Event('refreshDashboard'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Applications</h2>
          <p className="text-slate-500 dark:text-slate-400">Backend-synced job applications from your API.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              placeholder="Search company, role, or title..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Applied At</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Loading applications...</td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">No applications found.</td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    className="group hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    onClick={() => openDetails(app.id)}
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{app.company_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{app.role}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 capitalize">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatIndiaDateTime(app.applied_at || app.created_at)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {app.location || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-all"
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
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Application</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" placeholder="Company Name" value={form.company_name} onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))} required />
                <input className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" placeholder="Role" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} required />
                <input className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" placeholder="Portal (LinkedIn, Careers...)" value={form.portal} onChange={(e) => setForm((prev) => ({ ...prev, portal: e.target.value }))} required />
                <input className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" placeholder="Job Title" value={form.job_title} onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))} required />
                <select className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <input type="datetime-local" className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" value={form.applied_at} onChange={(e) => setForm((prev) => ({ ...prev, applied_at: e.target.value }))} />
                <input className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" placeholder="Location" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} required />
                <input type="number" className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" placeholder="Salary Mentioned" value={form.salary_mentioned} onChange={(e) => setForm((prev) => ({ ...prev, salary_mentioned: e.target.value }))} />
                <input className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 md:col-span-2" placeholder="Skills (comma separated)" value={form.skills_csv} onChange={(e) => setForm((prev) => ({ ...prev, skills_csv: e.target.value }))} />
                <textarea className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 md:col-span-2 min-h-24" placeholder="Job Description" value={form.job_description} onChange={(e) => setForm((prev) => ({ ...prev, job_description: e.target.value }))} required />
                <textarea className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 md:col-span-2 min-h-20" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.is_remote} onChange={(e) => setForm((prev) => ({ ...prev, is_remote: e.target.checked }))} />
                  Remote role
                </label>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200">Cancel</button>
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
          <div className="h-full w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-y-auto transition-colors" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Application Details</h3>
              <button onClick={() => setSelectedApp(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isDetailsLoading ? (
              <div className="text-slate-500 dark:text-slate-400">Loading details...</div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{selectedApp.company_name}</p>
                    <p className="text-slate-500 dark:text-slate-400">{selectedApp.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p><span className="font-semibold">Job Title:</span> {selectedApp.job_title || '-'}</p>
                  <p><span className="font-semibold">Portal:</span> {selectedApp.portal || '-'}</p>
                  <p><span className="font-semibold">Location:</span> {selectedApp.location || '-'}</p>
                  <p><span className="font-semibold">Applied:</span> {formatIndiaDateTime(selectedApp.applied_at)}</p>
                  <p><span className="font-semibold">Salary:</span> {selectedApp.salary_mentioned || '-'}</p>
                  <p><span className="font-semibold">Remote:</span> {selectedApp.is_remote ? 'Yes' : 'No'}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    value={selectedApp.status}
                    onChange={(e) => handleStatusUpdate(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">Job Description</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-700">{selectedApp.job_description || '-'}</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">Notes</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-700">{selectedApp.notes || '-'}</p>
                </div>

                <div>
                  <ScreeningAnswers applicationId={selectedApp.id} />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">Timeline</h4>
                  {(selectedApp.timeline_events || []).length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No timeline events yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(selectedApp.timeline_events || []).map((event) => (
                        <div key={event.id} className="text-sm bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-100">{event.title || event.event_type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">{event.event_type.replace(/_/g, ' ')}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEditTimelineEvent(event)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:hover:text-blue-400"
                            >
                              Edit
                            </button>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {formatIndiaDateTime(event.event_at)}
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

      {showTimelineEditModal && editingTimelineEvent && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Timeline Event</h3>
              <button type="button" onClick={() => setShowTimelineEditModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTimelineEvent}>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Timeline Title</label>
                  <input
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                    value={timelineTitle}
                    onChange={(e) => setTimelineTitle(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 flex gap-3">
                <button type="button" className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200" onClick={() => setShowTimelineEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
