import React, { Suspense } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './contexts/AuthContext'

// Components
import Navbar from './components/layout/Navbar'
import LoadingSpinner from './components/ui/LoadingSpinner'
import LoginForm from './components/auth/LoginForm'
import RegisterForm from './components/auth/RegisterForm'
import ChatbotInterface from './components/ChatbotInterface'
import ChatbotLauncher from './components/ChatbotLauncher'
import QuotesHistory from './components/QuotesHistory'
import Profile from './components/Profile'
import LanguageToggle from './components/LanguageToggle'
import Landing from './pages/Landing'
import { ToastProvider } from './components/ui/Toast'

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// Public Route wrapper (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />
}

function App() {
  const { i18n } = useTranslation()
  const { loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <Suspense fallback={<LoadingSpinner />}>
        <ToastProvider>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <div className="relative">
                    <LanguageToggle className="absolute top-4 right-4 z-10" />
                    <LoginForm />
                  </div>
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <div className="relative">
                    <LanguageToggle className="absolute top-4 right-4 z-10" />
                    <RegisterForm />
                  </div>
                </PublicRoute>
              }
            />

            {/* Public landing */}
            {/* Backward compatibility: redirect old '/auth' path to '/login' */}
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route path="/" element={<Landing />} />
            {/* Protected app area */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-50">
                    <Navbar />
                    <main className="container mx-auto px-4 py-8">
                      <Outlet />
                    </main>
                  </div>
                </ProtectedRoute>
              }
            >
              <Route index element={<ChatbotInterface />} />
              <Route path="quotes" element={<QuotesHistory />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>
          </Routes>
          {/* Global floating chatbot */}
          {!(location.pathname === '/login' || location.pathname === '/register') && (
            <ChatbotLauncher />
          )}
        </ToastProvider>
      </Suspense>
    </div>
  )
}

export default App