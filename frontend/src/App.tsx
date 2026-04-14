import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Loader2 } from 'lucide-react';

// Lazy load components from features
const Landing = lazy(() => import('./features/landing').then(m => ({ default: m.Landing })));
const Login = lazy(() => import('./features/auth').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./features/dashboard').then(m => ({ default: m.Dashboard })));
const SetupSession = lazy(() => import('./features/session').then(m => ({ default: m.SetupSession })));
const InterviewRoom = lazy(() => import('./features/session').then(m => ({ default: m.InterviewRoom })));
const SessionDetail = lazy(() => import('./features/session').then(m => ({ default: m.SessionDetail })));
const Onboarding = lazy(() => import('./features/onboarding').then(m => ({ default: m.Onboarding })));
const Profile = lazy(() => import('./features/profile').then(m => ({ default: m.Profile })));

// Loading component for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 text-[#003fb1] animate-spin" />
      <p className="text-[#434654] font-medium animate-pulse">Đang tải trang...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/" element={<Layout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="setup" element={<SetupSession />} />
                <Route path="session/:id" element={<InterviewRoom />} />
                <Route path="session/:id/summary" element={<SessionDetail />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
