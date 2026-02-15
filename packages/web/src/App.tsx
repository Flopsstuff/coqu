import { useEffect, useState } from "react";
import type { ApiResponse, HealthStatus } from "@coqu/shared";

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/health")
      .then((res) => res.json())
      .then((data: ApiResponse<HealthStatus>) => {
        if (data.success && data.data) {
          setHealth(data.data);
        } else {
          setError(data.error ?? "Unknown error");
        }
      })
      .catch(() => setError("Failed to connect to API"));
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>coqu</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {health && (
        <div>
          <p>API Status: {health.status}</p>
          <p>Version: {health.version}</p>
          <p>Time: {health.timestamp}</p>
        </div>
      )}
      {!health && !error && <p>Loading...</p>}
    </div>
  );
}
