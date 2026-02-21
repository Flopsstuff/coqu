import { useEffect, useState } from "react";
import type { AgentEnv } from "@coqu/shared";
import { Header } from "../Header";
import { apiFetch } from "../api";

export function EnvPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<AgentEnv>("/api/env").then((res) => {
      if (res.success && res.data) {
        setContent(res.data.content);
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await apiFetch<never>("/api/env", {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="home">
      <Header />

      <div className="home-content">
        <div className="page-header">
          <h2 className="page-title">Environment Variables</h2>
        </div>

        {loading ? (
          <div className="projects-loading">Loading...</div>
        ) : (
          <div className="project-detail">
            <div className="project-detail-section">
              <textarea
                className="env-editor"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="ANTHROPIC_API_KEY=sk-ant-..."
                rows={10}
                style={{ width: "100%", fontFamily: "monospace", resize: "vertical" }}
              />
              <div className="detail-actions" style={{ marginTop: 8 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : saved ? "Saved!" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
