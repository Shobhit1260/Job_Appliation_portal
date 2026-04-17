import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Bell, 
  Settings, 
  LogOut,
  ChevronRight,
  Search,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SidebarLink = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
      isActive 
        ? "bg-blue-600 text-white shadow-sm" 
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    )}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
    <ChevronRight className={cn(
      "ml-auto w-4 h-4 opacity-0 transition-opacity group-hover:opacity-100",
      "group-[.active]:opacity-100"
    )} />
  </NavLink>
);

export const Layout = ({ children }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = React.useState(0);

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const response = await notificationApi.getNotifications({ limit: 1 });
      const payload = response?.data || response || {};
      setUnreadCount(payload.unread_count || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  React.useEffect(() => {
    fetchUnreadCount();
    const refreshInterval = setInterval(fetchUnreadCount, 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [fetchUnreadCount]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNewApplication = () => {
    if (location.pathname === '/applications') {
      window.dispatchEvent(new Event('openCreateApplication'));
      return;
    }
    navigate('/applications?open=create');
  };

  const handleOpenNotifications = () => {
    navigate('/settings?tab=notifications');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">JobTrack Pro</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <SidebarLink to="/applications" icon={Briefcase} label="Applications" />
          <SidebarLink to="/resumes" icon={FileText} label="Resumes" />
          <SidebarLink to="/reminders" icon={Bell} label="Reminders" />
          <div className="my-4 h-px bg-slate-200" />
          <SidebarLink to="/settings" icon={Settings} label="Settings" />
        </nav>

        <div className="p-4 mt-auto border-t">
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-10 h-10 rounded-full border overflow-hidden bg-slate-100">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'default'}`} 
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate text-slate-900">{user?.email?.split('@')[0] || 'User'}</span>
              <span className="text-xs text-slate-500 truncate">{user?.email || 'user@example.com'}</span>
            </div>
          </div>
          <button 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b bg-white/80 backdrop-blur-sm flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search applications, companies..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleNewApplication}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Application
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <button
              onClick={handleOpenNotifications}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors"
              aria-label="Open notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-white flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {children}
        </div>
      </main>
    </div>
  );
};
