// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Plus, Calendar, Briefcase, X, Loader2 } from 'lucide-react';
import { reminderApi, applicationApi } from '../api';
import { toast } from 'sonner';
import { getErrorMessage } from '../utils/errorHandler';

const initialReminderForm = {
  title: '',
  remind_at: '',
  application_id: '',
};

const formatDateTime = (value) => {
  if (!value) return '-';

  let normalizedValue = value;

  // Backend currently returns naive UTC datetimes without timezone suffix.
  // If timezone info is missing, force UTC so local display is correct.
  const hasTimezone = /[zZ]|[+\-]\d\d:\d\d$/.test(value);
  if (!hasTimezone) {
    normalizedValue = `${value.replace(' ', 'T')}Z`;
  }

  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSent, setShowSent] = useState(false);
  const [newReminder, setNewReminder] = useState(initialReminderForm);

  const fetchData = async () => {
    try {
      const [remRes, appRes] = await Promise.all([
        reminderApi.getAll(),
        applicationApi.getAll({ page: 1, page_size: 100 }),
      ]);
      setReminders(remRes.data?.reminders || []);
      setApplications(appRes.data?.applications || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredReminders = useMemo(() => {
    return reminders.filter((reminder) => {
      if (showSent) return reminder.is_sent;
      return !reminder.is_sent;
    });
  }, [reminders, showSent]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await reminderApi.create({
        title: newReminder.title.trim(),
        remind_at: newReminder.remind_at ? new Date(newReminder.remind_at).toISOString() : null,
        application_id: newReminder.application_id,
      });

      toast.success('Reminder created');
      setNewReminder(initialReminderForm);
      setShowAddModal(false);
      setIsLoading(true);
      await fetchData();
      
      // Emit event to refresh dashboard
      window.dispatchEvent(new Event('refreshDashboard'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getApplicationLabel = (applicationId) => {
    if (!applicationId) return 'Unknown application';
    const app = applications.find((item) => item.id === applicationId);
    if (!app) return 'Unknown application';
    return `${app.company_name} - ${app.role}`;
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Reminders</h2>
          <p className="text-slate-500">Create reminders mapped to your applications and backend schema.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Reminder
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSent(false)}
          className={`px-3 py-1.5 rounded-lg text-sm border ${!showSent ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setShowSent(true)}
          className={`px-3 py-1.5 rounded-lg text-sm border ${showSent ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}
        >
          Sent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-slate-500">Loading reminders...</div>
        ) : filteredReminders.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 italic bg-white rounded-2xl border border-dashed border-slate-200">
            No reminders for this filter.
          </div>
        ) : (
          filteredReminders.map((reminder) => (
            <div key={reminder.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${reminder.is_sent ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {reminder.is_sent ? 'sent' : 'pending'}
                </span>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-3">{reminder.title}</h3>
              <div className="space-y-2 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateTime(reminder.remind_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>{getApplicationLabel(reminder.application_id)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Create Reminder</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Title</label>
                  <input
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Remind At</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    value={newReminder.remind_at}
                    onChange={(e) => setNewReminder((prev) => ({ ...prev, remind_at: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Application</label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    value={newReminder.application_id}
                    onChange={(e) => setNewReminder((prev) => ({ ...prev, application_id: e.target.value }))}
                    required
                  >
                    <option value="">Select an application</option>
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.company_name} - {app.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-6 border-t bg-slate-50/50 flex gap-3">
                <button type="button" className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
