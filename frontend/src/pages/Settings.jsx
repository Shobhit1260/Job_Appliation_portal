import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bell,
  Moon,
  Mail,
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { settingsApi, notificationApi } from '../api';
import { toast } from 'sonner';
import { getErrorMessage } from '../utils/errorHandler';

export const Settings = () => {
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'notifications' ? 'notifications' : 'preferences');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (nextTab === 'notifications' || nextTab === 'preferences') {
      setActiveTab(nextTab);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchSettings();
    if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const { data } = await settingsApi.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await notificationApi.getNotifications({ limit: 50 });
      const payload = response?.data || response || {};
      setNotifications(payload.notifications || []);
      setUnreadCount(payload.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    }
  };

  const handleSettingChange = async (field, value) => {
    if (!settings) return;

    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));

    setIsSaving(true);
    try {
      const { data } = await settingsApi.updateSettings({
        [field]: value,
      });
      setSettings(data);
      toast.success('Setting updated');
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Revert on error
      await fetchSettings();
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await notificationApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (!window.confirm('Delete all notifications?')) return;

    try {
      await notificationApi.deleteAll();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications deleted');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const SettingToggle = ({ label, description, field }) => (
    <div className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50/50 transition-colors">
      <div className="flex-1">
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <button
        onClick={() => handleSettingChange(field, !settings?.[field])}
        disabled={isSaving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          settings?.[field] ? 'bg-blue-600' : 'bg-slate-200'
        } ${isSaving ? 'opacity-50' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            settings?.[field] ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h2>
        <p className="text-slate-500">Manage your preferences and notifications</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'preferences'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Preferences
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          Notifications
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Preferences Tab */}
      {activeTab === 'preferences' && settings && (
        <div className="grid gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Notifications
              </h3>
              <p className="text-sm text-slate-500 mt-1">Control when you receive email notifications</p>
            </div>
            <div className="space-y-3">
              <SettingToggle
                label="Email Notifications"
                description="Receive email notifications for important updates"
                field="email_notifications"
              />
              <SettingToggle
                label="Reminder Notifications"
                description="Get reminders about upcoming application deadlines"
                field="reminder_notifications"
              />
              <SettingToggle
                label="Application Updates"
                description="Notifications when application status changes"
                field="application_updates"
              />
              <SettingToggle
                label="Interview Reminders"
                description="Receive reminders before scheduled interviews"
                field="interview_reminders"
              />
              <SettingToggle
                label="Offer Notifications"
                description="Get notified immediately when you receive offers"
                field="offer_notifications"
              />
              <SettingToggle
                label="Weekly Digest"
                description="Receive a weekly summary of your job search progress"
                field="weekly_digest"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Appearance
              </h3>
              <p className="text-sm text-slate-500 mt-1">Customize how the app looks</p>
            </div>
            <div className="space-y-3">
              <SettingToggle
                label="Dark Mode"
                description="Enable dark theme for reduced eye strain"
                field="dark_mode"
              />
              <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50/50 transition-colors">
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Theme
                </label>
                <select
                  value={settings.theme || 'light'}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Notifications</h3>
              <p className="text-sm text-slate-500 mt-1">
                {notifications.length} total • {unreadCount} unread
              </p>
            </div>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={handleDeleteAllNotifications}
                  className="px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50/50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      {notification.description && (
                        <p className="text-sm text-slate-600 mb-2">
                          {notification.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
