import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  TrendingUp, 
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Bell,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { applicationApi, dashboardApi, reminderApi } from '../api';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/**
 * @typedef {Object} DashboardSummary
 * @property {number} total_applications
 * @property {Record<string, number>} by_status
 * @property {Record<string, number>} by_portal
 * @property {{ applied: number, screened: number, interviewed: number, offered: number }} funnel
 * @property {{ response_rate_pct: number, offer_rate_pct: number, ghosted: number, rejected: number }} kpis
 */

/**
 * @typedef {Object} DashboardApplication
 * @property {string} id
 * @property {string} company_name
 * @property {string} role
 */

/**
 * @typedef {Object} DashboardReminder
 * @property {string} id
 * @property {string} title
 * @property {string | null} remind_at
 * @property {string | null} application_id
 * @property {boolean} is_sent
 * @property {string} [applicationLabel]
 */

export const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(/** @type {DashboardSummary | null} */ (null));
  const [recentReminders, setRecentReminders] = useState(/** @type {DashboardReminder[]} */ ([]));
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(/** @type {Date | null} */ (null));

  /**
   * @param {string | null | undefined} value
   */
  const formatReminderDue = (value) => {
    if (!value) return 'No due date';

    let normalizedValue = value;
    const hasTimezone = /[zZ]|[+\-]\d\d:\d\d$/.test(value);
    if (!hasTimezone) {
      normalizedValue = `${value.replace(' ', 'T')}Z`;
    }

    const dueDate = new Date(normalizedValue);
    if (Number.isNaN(dueDate.getTime())) return 'Invalid due date';

    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const absoluteHours = Math.abs(diffHours);

    if (absoluteHours < 24) {
      if (diffHours >= 0) return `Due in ${absoluteHours} hour${absoluteHours === 1 ? '' : 's'}`;
      return `${absoluteHours} hour${absoluteHours === 1 ? '' : 's'} overdue`;
    }

    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const absoluteDays = Math.abs(diffDays);
    if (diffDays >= 0) return `Due in ${absoluteDays} day${absoluteDays === 1 ? '' : 's'}`;
    return `${absoluteDays} day${absoluteDays === 1 ? '' : 's'} overdue`;
  };

  const fetchDashboard = async () => {
    try {
      const [dashboardResponse, remindersResponse, appsResponse] = await Promise.all([
        dashboardApi.getSummary(),
        reminderApi.getAll({ limit: 20 }),
        applicationApi.getAll({ page: 1, page_size: 100 }),
      ]);

      /** @type {DashboardSummary} */
      const dashboardData = dashboardResponse?.data || {};
      console.log("dashboardData:",dashboardData)
      /** @type {DashboardReminder[]} */
      const reminders = remindersResponse?.data?.reminders || [];
      /** @type {DashboardApplication[]} */
      const applications = appsResponse?.data?.applications || [];
      const appMap = applications.reduce((/** @type {Record<string, DashboardApplication>} */ acc, app) => {
        acc[app.id] = app;
        return acc;
      }, {});

      const upcomingReminders = reminders
        .filter((/** @type {DashboardReminder} */ item) => !item.is_sent)
        .sort((a, b) => {
          const aTime = new Date(a.remind_at || 0).getTime();
          const bTime = new Date(b.remind_at || 0).getTime();
          return aTime - bTime;
        })
        .slice(0, 5)
        .map((/** @type {DashboardReminder} */ item) => ({
          ...item,
          applicationLabel: item.application_id && appMap[item.application_id]
            ? `${appMap[item.application_id].company_name} • ${appMap[item.application_id].role}`
            : 'Unknown application',
        }));

      setData(dashboardData);
      setRecentReminders(upcomingReminders);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboard();
    toast.success('Dashboard refreshed');
  };

  useEffect(() => {
    fetchDashboard();

    // Set up event listener for CRUD operations
    const handleRefreshDashboard = () => {
      fetchDashboard();
    };

    window.addEventListener('refreshDashboard', handleRefreshDashboard);

    // Set up auto-refresh every 5 minutes
    const autoRefreshInterval = setInterval(() => {
      fetchDashboard();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('refreshDashboard', handleRefreshDashboard);
      clearInterval(autoRefreshInterval);
    };
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-full text-slate-500 font-medium">Loading Dashboard...</div>;

  // Transform backend data structure to frontend format
  const statusBreakdownArray = data?.by_status 
    ? Object.entries(data.by_status).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    : [];

  const portalBreakdownArray = data?.by_portal 
    ? Object.entries(data.by_portal).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    : [];

  const kpis = [
    { title: 'Total Applications', value: data?.total_applications || 0, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%', trendUp: true },
    { title: 'Response Rate', value: `${(data?.kpis?.response_rate_pct || 0).toFixed(0)}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+5%', trendUp: true },
    { title: 'Offer Rate', value: `${(data?.kpis?.offer_rate_pct || 0).toFixed(0)}%`, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', trend: '-2%', trendUp: false },
    { title: 'Rejected', value: data?.kpis?.rejected || 0, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', trend: '+1', trendUp: false },
  ];

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-500">Welcome back! Here's what's happening with your job search.</p>
          {lastRefreshed && (
            <p className="text-xs text-slate-400 mt-2">
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-white transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm">View All Activity</button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${kpi.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {kpi.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.trend}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Application Funnel */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Application Funnel</h3>
            <p className="text-sm text-slate-500">Visualizing your progress from application to offer</p>
          </div>
          <div className="h-75">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Applied', value: data?.funnel?.applied || 0 },
                { name: 'Screened', value: data?.funnel?.screened || 0 },
                { name: 'Interviewed', value: data?.funnel?.interviewed || 0 },
                { name: 'Offered', value: data?.funnel?.offered || 0 },
              ]}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Status Breakdown</h3>
            <p className="text-sm text-slate-500">Current state of all applications</p>
          </div>
          <div className="h-75 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={statusBreakdownArray}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusBreakdownArray.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-4">
              {statusBreakdownArray.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-slate-500 truncate">{entry.name}</span>
                  <span className="text-xs font-bold text-slate-900 ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Portal Stats & Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Portal Distribution</h3>
            <p className="text-sm text-slate-500">Where you are finding your opportunities</p>
          </div>
          <div className="h-62.5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portalBreakdownArray} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Reminders</h3>
              <p className="text-sm text-slate-500">Upcoming tasks for your applications</p>
            </div>
            <button
              onClick={() => navigate('/reminders')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentReminders.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-sm text-slate-500">
                No pending reminders found.
              </div>
            ) : (
              recentReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate('/reminders')}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{reminder.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatReminderDue(reminder.remind_at)} • {reminder.applicationLabel}
                    </p>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                    Pending
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
