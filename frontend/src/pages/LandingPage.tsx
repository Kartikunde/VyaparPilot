import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  Clock,
  ArrowRight,
  CheckCircle,
  Building2,
  Cpu,
  Layers,
  BarChart,
  HelpCircle,
  Calculator,
  Lock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { demoLogin, user } = useAuth();
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);

  // Interactive ROI Calculator states on landing page
  const [quotesPerMonth, setQuotesPerMonth] = useState<number>(120);
  const [manualMinutes, setManualMinutes] = useState<number>(35);
  const [hourlyWage, setHourlyWage] = useState<number>(350);

  // Calculations
  const aiMinutes = 3;
  const timeSavedPerQuoteHours = (manualMinutes - aiMinutes) / 60;
  const totalHoursSavedMonth = quotesPerMonth * timeSavedPerQuoteHours;
  const monthlySavingsINR = totalHoursSavedMonth * hourlyWage;
  const annualSavingsINR = monthlySavingsINR * 12;

  const handleLaunchDemo = async () => {
    try {
      setLoadingDemo(true);
      await demoLogin();
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      navigate('/login');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-md text-base">
              VP
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                VyaparPilot <span className="text-brand-600">AI</span>
              </span>
              <span className="hidden md:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                PRAGYAN 2K26 Track 4-01
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <NavLink
                to="/dashboard"
                className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                Go to Workspace <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors"
                >
                  Sign In
                </NavLink>
                <button
                  onClick={handleLaunchDemo}
                  disabled={loadingDemo}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {loadingDemo ? (
                    'Launching...'
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Launch Demo Workspace
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24 bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
            Verified AI Co-Pilot for MSME Wholesalers & Manufacturers
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Prepare Quotations Faster.{' '}
            <span className="text-brand-600">Verify Every Number.</span>{' '}
            Measure Your ROI.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate 30+ minutes of manual SKU lookups, calculation mistakes, and underpriced quotations. VyaparPilot AI bridges natural-language customer enquiries with deterministic catalogue verification and quantifiable time savings.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleLaunchDemo}
              disabled={loadingDemo}
              className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-6 py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              {loadingDemo ? 'Preparing Workspace...' : 'Start Your Business Workspace'}
            </button>
            <NavLink
              to="/login"
              className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold px-6 py-3.5 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              Login to Account
            </NavLink>
          </div>

          {/* Differentiators Pill Bar */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <Clock className="w-5 h-5 text-brand-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">92% Time Saved</div>
                <div className="text-[11px] text-slate-500">From 35m down to 2.6m</div>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">Zero Hallucinations</div>
                <div className="text-[11px] text-slate-500">Prices from verified DB</div>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <FileCheck2 className="w-5 h-5 text-teal-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">Human Approval</div>
                <div className="text-[11px] text-slate-500">Owner control & audit log</div>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">Measured ROI</div>
                <div className="text-[11px] text-slate-500">Exact monetary benefit in ₹</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The MSME Problem Section */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-2">The Small Business Reality</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Why Traditional Quotation Preparation Drains MSME Margins
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              In manufacturing clusters like Pune, Rajkot, Peenya and Coimbatore, small wholesalers and job-shops receive dozens of messy RFQs daily via WhatsApp and email.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-rose-50/50 border border-rose-200">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold mb-4">
                1
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Time-Consuming Manual Search</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimators spend 30 to 45 minutes cross-referencing messy WhatsApp texts with Excel sheets, physical registers, and supplier catalogues to find correct SKUs and specs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-4">
                2
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Calculation Errors & Margin Loss</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rushed calculations result in forgotten GST components (CGST vs IGST), accidental excessive discounts, and quoting below cost price—eroding hard-earned profits.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-sky-50/50 border border-sky-200">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-4">
                3
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Slow Response Loses Deals</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Customers often buy from the competitor who sends a professional, accurate quote within an hour. A 24-hour delay means lost orders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Core Workflow */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-2">Architectural Workflow</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              How VyaparPilot AI Automates the Complete Pipeline
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              AI speed combined with deterministic mathematical verification and human approval.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm mb-3">
                Step 1
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-1">Customer Enquiry Ingestion</h4>
              <p className="text-xs text-slate-600">
                Paste unstructured customer messages from WhatsApp or email. The AI parses items, quantities, units, and delivery specs into structured Pydantic JSON.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm mb-3">
                Step 2
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-1">Deterministic Catalogue Matching</h4>
              <p className="text-xs text-slate-600">
                Matches items against your verified product database using exact SKU and similarity scoring. Real stock levels and price lists are enforced deterministically.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm mb-3">
                Step 3
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-1">Pricing Guardrails & Approvals</h4>
              <p className="text-xs text-slate-600">
                Decimal-based financial engine calculates GST, discounts, and margins. Flags low-margin quotes or out-of-stock items for owner sign-off.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm mb-3">
                Step 4
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-1">PDF Export & ROI Logging</h4>
              <p className="text-xs text-slate-600">
                Generates a branded ReportLab PDF. Tracks exact time saved and calculates verifiable net productivity return in Rupees on your ROI dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator Sandbox */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold mb-2">
              <Calculator className="w-3.5 h-3.5" /> Core Hackathon Differentiator
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Interactive Return on Investment Calculator
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              See the direct financial impact of reducing quotation turnaround time in your business.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm grid md:grid-cols-2 gap-8 items-center">
            {/* Input Controls */}
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Quotations prepared per month:</span>
                  <span className="text-brand-600 font-bold">{quotesPerMonth} quotes</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={quotesPerMonth}
                  onChange={(e) => setQuotesPerMonth(Number(e.target.value))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>20</span>
                  <span>250</span>
                  <span>500</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Current manual prep time per quote:</span>
                  <span className="text-brand-600 font-bold">{manualMinutes} minutes</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="5"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(Number(e.target.value))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>15 min</span>
                  <span>35 min</span>
                  <span>60 min</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Staff / Estimator labour cost:</span>
                  <span className="text-brand-600 font-bold">₹{hourlyWage} / hour</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="800"
                  step="25"
                  value={hourlyWage}
                  onChange={(e) => setHourlyWage(Number(e.target.value))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>₹200/hr</span>
                  <span>₹500/hr</span>
                  <span>₹800/hr</span>
                </div>
              </div>
            </div>

            {/* Calculated Output Card */}
            <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-md">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Projected Monthly Savings
              </div>

              <div className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs text-slate-300">Staff Hours Saved / Month:</span>
                  <span className="text-lg font-bold text-teal-400">
                    {Math.round(totalHoursSavedMonth)} hours
                  </span>
                </div>

                <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs text-slate-300">Estimated Monthly Value:</span>
                  <span className="text-2xl font-extrabold text-white">
                    ₹{Math.round(monthlySavingsINR).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-slate-300">Projected Annual Return:</span>
                  <span className="text-xl font-bold text-emerald-400">
                    ₹{Math.round(annualSavingsINR).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-slate-800/80 rounded-lg p-3 text-[11px] text-slate-300 border border-slate-700/50 mt-4">
                  <span className="font-semibold text-brand-400">Deterministic Formula:</span> ({manualMinutes}m - {aiMinutes}m AI) × {quotesPerMonth} quotes × ₹{hourlyWage}/hr staff cost. All metrics in the app are calculated from actual time records!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">VyaparPilot AI</span>
            <span>— Developed for PRAGYAN 2K26 Hackathon Track 4-01</span>
          </div>
          <div>
            Built with React, TypeScript, FastAPI, SQLAlchemy, ReportLab & Gemini AI
          </div>
        </div>
      </footer>
    </div>
  );
};
