import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthResponse } from "@coqu/shared";
import { apiFetch } from "../api";
import { useAuth } from "../AuthContext";

export function SetupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await apiFetch<AuthResponse>("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    if (res.success && res.data) {
      login(res.data.token, res.data.user);
      navigate("/");
    } else {
      setError(res.error ?? "Setup failed");
    }
    setSubmitting(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Initial Setup</h1>
        <p className="subtitle">Create the admin account to get started.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Admin"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Creating..." : "Create Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
