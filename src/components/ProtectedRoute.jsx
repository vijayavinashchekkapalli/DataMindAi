import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function AuthLoadingScreen() {
  return (
    <main className="auth-loading-screen" role="status" aria-live="polite">
      <span className="auth-loading-spinner" />
      <p>Checking your session…</p>
    </main>
  );
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, logoutInProgress } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to={logoutInProgress ? "/" : "/login"} replace state={logoutInProgress ? null : { from: location }} />;
  }
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}
