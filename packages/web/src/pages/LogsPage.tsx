import { useEffect, useState, useCallback } from "react";
import type { ApiResponse, LogEntry, LogsResponse, LogDatesResponse, LogLevel, LogCategory } from "@coqu/shared";
import { Header } from "../Header";
import { apiFetch } from "../api";

const LEVELS: LogLevel[] = ["info", "warn", "error"];
const CATEGORIES: LogCategory[] = ["auth", "projects", "agents", "git", "system"];
const PAGE_SIZE = 100;

function levelColor(level: number): string {
  if (level >= 50) return "var(--color-error)";
  if (level >= 40) return "#eab308";
  return "var(--color-success)";
}

function levelLabel(level: number): string {
  if (level >= 50) return "error";
  if (level >= 40) return "warn";
  return "info";
}

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString();
}

export function LogsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [level, setLevel] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [offset, setOffset] = useState(0);

  const fetchLogs = useCallback(async (newOffset: number, append: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("date", date);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(newOffset));
      if (level) params.set("level", level);
      if (category) params.set("category", category);

      const res = await apiFetch<LogsResponse>(`/api/logs?${params}`);
      if (res.success && res.data) {
        setEntries((prev) => append ? [...prev, ...res.data!.entries] : res.data!.entries);
        setTotal(res.data.total);
        setOffset(newOffset);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [date, level, category]);

  useEffect(() => {
    apiFetch<LogDatesResponse>("/api/logs/dates").then((res) => {
      if (res.success && res.data) {
        setDates(res.data.dates);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setEntries([]);
    setOffset(0);
    fetchLogs(0, false);
  }, [date, level, category, fetchLogs]);

  const hasMore = offset + PAGE_SIZE < total;

  function clearFilters() {
    setLevel("");
    setCategory("");
  }

  const hasFilters = level || category;

  return (
    <div className="home">
      <Header />
      <div className="home-content">
        <h2 className="page-title">Logs</h2>

        <div className="logs-filters">
          <div className="logs-filter-group">
            <label htmlFor="log-date">Date</label>
            <select
              id="log-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="logs-select"
            >
              {dates.length === 0 && (
                <option value={date}>{date}</option>
              )}
              {dates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="logs-filter-group">
            <label htmlFor="log-level">Level</label>
            <select
              id="log-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="logs-select"
            >
              <option value="">All</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="logs-filter-group">
            <label htmlFor="log-category">Category</label>
            <select
              id="log-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="logs-select"
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && entries.length === 0 && (
          <p className="loading">Loading logs...</p>
        )}

        {!loading && entries.length === 0 && (
          <div className="logs-empty">
            {hasFilters ? (
              <>
                <p>No logs matching filters</p>
                <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button>
              </>
            ) : (
              <p>No logs for this date</p>
            )}
          </div>
        )}

        {entries.length > 0 && (
          <div className="logs-list">
            {entries.map((entry, i) => (
              <div key={`${entry.time}-${i}`} className="logs-entry">
                <span className="logs-time">{formatTime(entry.time)}</span>
                <span
                  className="logs-badge"
                  style={{ backgroundColor: levelColor(entry.level) }}
                >
                  {levelLabel(entry.level)}
                </span>
                <span className="logs-badge logs-badge-category">
                  {entry.category}
                </span>
                <span className="logs-msg">{entry.msg}</span>
                {(entry.projectId || entry.userId || entry.agentId) && (
                  <span className="logs-context">
                    {entry.userId && `user:${entry.userId.slice(0, 8)}`}
                    {entry.projectId && ` project:${entry.projectId.slice(0, 8)}`}
                    {entry.agentId && ` agent:${entry.agentId.slice(0, 8)}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <button
            className="btn btn-ghost logs-load-more"
            onClick={() => fetchLogs(offset + PAGE_SIZE, true)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
