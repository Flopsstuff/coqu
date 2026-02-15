import { useEffect, useState } from "react";
import type { ApiToken, CreateTokenResponse } from "@coqu/shared";
import { Header } from "../Header";
import { apiFetch } from "../api";

export function TokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    const res = await apiFetch<ApiToken[]>("/api/tokens");
    if (res.success && res.data) {
      setTokens(res.data);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNewToken(null);

    const res = await apiFetch<CreateTokenResponse>("/api/tokens", {
      method: "POST",
      body: JSON.stringify({ name: name.trim() }),
    });

    if (res.success && res.data) {
      setNewToken(res.data.token);
      setName("");
      setTokens((prev) => [res.data!.apiToken, ...prev]);
    } else {
      setError(res.error ?? "Failed to create token");
    }
  }

  async function handleDelete(id: string) {
    await apiFetch("/api/tokens/" + id, { method: "DELETE" });
    setTokens((prev) => prev.filter((t) => t.id !== id));
  }

  function handleCopy() {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="home">
      <Header />

      <div className="home-content">
        <h2 className="page-title">API Tokens</h2>

        <form onSubmit={handleCreate} className="token-form">
          <div className="token-form-row">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Token name"
              className="token-input"
            />
            <button type="submit" className="btn btn-primary token-create-btn" disabled={!name.trim()}>
              Create Token
            </button>
          </div>
        </form>

        {error && <div className="token-error">{error}</div>}

        {newToken && (
          <div className="token-alert">
            <p className="token-alert-warning">
              Copy this token now — it won't be shown again.
            </p>
            <div className="token-alert-value">
              <code>{newToken}</code>
              <button onClick={handleCopy} className="btn btn-sm btn-ghost">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div className="token-list">
          {tokens.map((t) => (
            <div key={t.id} className="token-item">
              <div className="token-item-info">
                <span className="token-item-name">{t.name}</span>
                <span className="token-item-meta">
                  Created {new Date(t.createdAt).toLocaleDateString()}
                  {t.lastUsedAt && (
                    <> · Last used {new Date(t.lastUsedAt).toLocaleDateString()}</>
                  )}
                </span>
              </div>
              <button onClick={() => handleDelete(t.id)} className="btn btn-sm btn-danger">
                Delete
              </button>
            </div>
          ))}
          {tokens.length === 0 && (
            <p className="token-empty">No API tokens yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
