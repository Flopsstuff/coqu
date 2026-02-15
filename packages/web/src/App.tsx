import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";

function AppRoutes() {
  const { user, needsSetup, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/setup"
        element={needsSetup ? <SetupPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/login"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="*"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : user ? (
            <HomePage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
