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
    { name: 'Verifiable ROI', href: '/roi', icon: TrendingUp, highlight: true },
    { name: 'Audit Trail', href: '/audit', icon: History },
    { name: 'Business Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Mobile Top Navigation */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white tracking-wider">
            VP
          </div>
          <span className="font-bold text-lg tracking-tight">VyaparPilot AI</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar for Desktop & Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Branding */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-md text-base">
              VP
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                VyaparPilot <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-mono font-semibold">AI</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">MSME Productivity Co-Pilot</div>
            </div>
          </div>

          {/* Current Workspace Info */}
          <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-brand-400" />
              Workspace
            </div>
            <div className="font-semibold text-xs text-white truncate" title={business?.name}>
              {business?.name || 'Apex Industrial Solutions'}
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Verified Database Active
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  } ${item.highlight && !isActive ? 'border border-brand-500/30 bg-brand-950/30 text-brand-300' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-brand-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-brand-500/30 text-brand-300 font-mono font-semibold px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="text-[9px] bg-teal-500/20 text-teal-300 font-semibold px-1.5 py-0.2 rounded border border-teal-500/30">
                      Core ROI
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/70">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user?.full_name ? user.full_name[0] : 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'Demo User'}</div>
                <div className="text-[10px] text-slate-400 capitalize">{user?.role || 'Owner'}</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-800 tracking-tight">
              {navigation.find((n) => location.pathname.startsWith(n.href))?.name || 'VyaparPilot AI'}
            </h1>
            <span className="hidden sm:inline-block text-xs text-slate-400">|</span>
            <span className="hidden sm:inline-block text-xs text-slate-500 font-medium">
              PRAGYAN 2K26 Track 4-01
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Demo Mode & Verifiable Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              <span>Verifiable Deterministic Math</span>
            </div>

            <NavLink
              to="/enquiries"
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New AI Quotation</span>
            </NavLink>
          </div>
        </header>

        {/* Page Outlet */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
