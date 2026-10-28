import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setError(null);
    setDemoLoading(true);
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo workspace login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <NavLink to="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white shadow-md text-lg">
            VP
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">
            VyaparPilot <span className="text-brand-600">AI</span>
          </span>
        </NavLink>
        <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter your business email or launch the demo workspace.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:p-9 shadow-sm border border-slate-200 rounded-2xl">
          {/* Quick Demo Access Callout */}
          <div className="mb-6 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-brand-50 to-teal-50 border border-brand-200/80">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-900 mb-1">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>Evaluator Demo Access</span>
            </div>
            <p className="text-xs text-slate-600 mb-3.5 leading-relaxed">
              Pre-loaded with catalogue items, quotations, and verified ROI data.
            </p>
            <button
              type="button"
              onClick={handleDemoAccess}
              disabled={demoLoading}
              className="w-full h-11 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {demoLoading ? 'Logging into Demo...' : 'Launch Demo Workspace'}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">Or sign in with email</span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@vyaparpilot.in"
                  className="block w-full pl-10 pr-3.5 h-11 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3.5 h-11 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 pt-0.5"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Don't have a business account?{' '}
            <NavLink to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Register New Workspace
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};
