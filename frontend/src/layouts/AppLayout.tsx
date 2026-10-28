import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  CheckCircle2,
  Package,
  Users,
  TrendingUp,
  History,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Building2,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, business, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Enquiry Studio', href: '/enquiries', icon: Sparkles, badge: 'AI' },
    { name: 'Quotations', href: '/quotations', icon: FileText },
    { name: 'Approvals Queue', href: '/approvals', icon: CheckCircle2 },
    { name: 'Product Catalogue', href: '/products', icon: Package },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'ROI Dashboard', href: '/roi', icon: TrendingUp, highlight: true },
    { name: 'Audit Trail', href: '/audit', icon: History },
    { name: 'Business Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Mobile Top Navigation */}
      <div className="md:hidden bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white tracking-wider text-sm shadow-sm">
            VP
          </div>
          <span className="font-bold text-lg tracking-tight">VyaparPilot AI</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay for Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar for Desktop & Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Logo Branding */}
          <div className="h-20 flex items-center px-6 border-b border-slate-800 gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white shadow-md text-base shrink-0">
              VP
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
                VyaparPilot <span className="text-xs px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-400 font-mono font-bold">AI</span>
              </div>
              <div className="text-xs text-slate-400 font-medium">MSME Productivity Co-Pilot</div>
            </div>
          </div>

          {/* Current Workspace Info */}
          <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-brand-400" />
              Workspace
            </div>
            <div className="font-bold text-sm text-white truncate" title={business?.name}>
              {business?.name || 'Apex Industrial Solutions'}
            </div>
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Verified DB
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-4 space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  } ${item.highlight && !isActive ? 'border border-brand-500/30 bg-brand-950/30 text-brand-300' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-brand-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-xs bg-brand-500/30 text-brand-300 font-mono font-bold px-2 py-0.5 rounded-md">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="text-xs bg-teal-500/20 text-teal-300 font-semibold px-2 py-0.5 rounded-md border border-teal-500/30">
                      ROI
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-brand-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                {user?.full_name ? user.full_name[0] : 'U'}
              </div>
              <div className="truncate">
                <div className="text-sm font-semibold text-white truncate">{user?.full_name || 'Demo User'}</div>
                <div className="text-xs text-slate-400 capitalize">{user?.role || 'Owner'}</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-20 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {navigation.find((n) => location.pathname.startsWith(n.href))?.name || 'VyaparPilot AI'}
            </h1>
            <span className="hidden sm:inline-block text-slate-300">|</span>
            <span className="hidden sm:inline-block text-xs sm:text-sm text-slate-500 font-medium">
              PRAGYAN 2K26 Track 4-01
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Verifiable Math Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>Verified Math</span>
            </div>

            <NavLink
              to="/enquiries"
              className="inline-flex items-center gap-2 h-11 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 sm:px-5 rounded-xl shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>New Quotation</span>
            </NavLink>
          </div>
        </header>

        {/* Page Outlet with Spacious Padding */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
