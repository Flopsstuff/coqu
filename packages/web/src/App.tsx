import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { TokensPage } from "./pages/TokensPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { NewProjectPage } from "./pages/NewProjectPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { AgentsPage } from "./pages/AgentsPage";
import { NewAgentPage } from "./pages/NewAgentPage";
import { AgentDetailPage } from "./pages/AgentDetailPage";

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
        path="/tokens"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : user ? (
            <TokensPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/projects"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : user ? (
            <ProjectsPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/projects/new"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : user ? (
            <NewProjectPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/projects/:id"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : user ? (
            <ProjectDetailPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/agents"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : user ? (
            <AgentsPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/agents/new"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : user ? (
            <NewAgentPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/agents/:id"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : user ? (
            <AgentDetailPage />
          ) : (
            <Navigate to="/login" replace />
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
