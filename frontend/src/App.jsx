import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useAuth } from './contexts/AuthContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SetupSession from './pages/SetupSession';
import InterviewRoom from './pages/InterviewRoom';
import SessionDetail from './pages/SessionDetail';
import Layout from './components/Layout';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#003fb1] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#434654] font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes with Layout (navbar) */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/setup" element={<SetupSession />} />
            <Route path="/session/:id" element={<InterviewRoom />} />
            <Route path="/session/:id/summary" element={<SessionDetail />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}