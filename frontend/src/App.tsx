import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { EnquiriesPage } from './pages/EnquiriesPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { QuotationBuilderPage } from './pages/QuotationBuilderPage';
import { QuotationDetailPage } from './pages/QuotationDetailPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ProductCataloguePage } from './pages/ProductCataloguePage';
import { CustomersPage } from './pages/CustomersPage';
import { ROIDashboardPage } from './pages/ROIDashboardPage';
import { AuditPage } from './pages/AuditPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { RetailerPortalPage } from './pages/RetailerPortalPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/portal/:token" element={<RetailerPortalPage />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/enquiries" element={<EnquiriesPage />} />
            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/quotations/new" element={<QuotationBuilderPage />} />
            <Route path="/quotations/:id" element={<QuotationDetailPage />} />
            <Route path="/quotations/:id/edit" element={<QuotationBuilderPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/products" element={<ProductCataloguePage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/roi" element={<ROIDashboardPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
