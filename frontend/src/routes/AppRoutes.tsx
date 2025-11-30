/**
 * Application Routes Configuration
 * Defines all routes for the application
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// Lazy load pages for better performance
const PublicDashboardPage = lazy(() => import('../pages/PublicDashboardPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));
const TwoFactorSettingsPage = lazy(() => import('../pages/TwoFactorSettingsPage'));
const TwoFactorSetupPage = lazy(() => import('../pages/TwoFactorSetupPage'));
const WalletDashboardPage = lazy(() => import('../pages/WalletDashboardPage'));
const TradingPage = lazy(() => import('../pages/TradingPage'));
const FeeStructurePage = lazy(() => import('../pages/FeeStructurePage'));
const PriceAlertsPage = lazy(() => import('../pages/PriceAlertsPage'));

// Loading fallback component
const PageLoader: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
    }}
    role="status"
    aria-label="Sayfa yukleniyor"
  >
    <CircularProgress size={48} />
  </Box>
);

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public landing page - shown when user first visits */}
        <Route path="/" element={<PublicDashboardPage />} />

        {/* Authentication routes */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* 2FA routes */}
        <Route path="/settings/2fa" element={<TwoFactorSettingsPage />} />
        <Route path="/settings/2fa/setup" element={<TwoFactorSetupPage />} />

        {/* Wallet routes */}
        <Route path="/wallet" element={<WalletDashboardPage />} />

        {/* Trading routes */}
        <Route path="/trading" element={<TradingPage />} />
        <Route path="/trade" element={<TradingPage />} />

        {/* Info routes */}
        <Route path="/fees" element={<FeeStructurePage />} />
        <Route path="/info/fees" element={<FeeStructurePage />} />

        {/* Alerts routes */}
        <Route path="/alerts" element={<PriceAlertsPage />} />
        <Route path="/price-alerts" element={<PriceAlertsPage />} />

        {/* Placeholder routes - to be implemented */}
        <Route path="/terms" element={<div>Terms of Service - Coming Soon</div>} />
        <Route path="/kvkk" element={<div>KVKK Privacy Policy - Coming Soon</div>} />

        {/* 404 fallback */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
