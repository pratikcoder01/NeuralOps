"use client";

import { useState, useEffect } from "react";

interface AnomalyEvent {
  id: string;
  hostname: string;
  metric: string;
  value: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  timestamp: string;
  status: "ACTIVE" | "REMEDIATING" | "RESOLVED";
}

interface RemediationLog {
  id: string;
  action: string;
  target: string;
  status: "IN_PROGRESS" | "SUCCESS" | "FAILED";
  duration: string;
  timestamp: string;
}

export default function Dashboard() {
  const [ingestionRate, setIngestionRate] = useState(420);
  const [activeAnomalies, setActiveAnomalies] = useState<AnomalyEvent[]>([
    {
      id: "anom-101",
      hostname: "k8s-node-primary-01",
      metric: "cpu_utilization",
      value: 94.6,
      severity: "CRITICAL",
      timestamp: "Just Now",
      status: "ACTIVE"
    },
    {
      id: "anom-102",
      hostname: "db-master-us-east",
      metric: "disk_space_exhaustion",
      value: 89.2,
      severity: "WARNING",
      timestamp: "5 mins ago",
      status: "ACTIVE"
    }
  ]);

  const [remediations, setRemediations] = useState<RemediationLog[]>([
    {
      id: "rem-901",
      action: "restart_systemd_service",
      target: "neuralops-alerting",
      status: "SUCCESS",
      duration: "2.05s",
      timestamp: "10 mins ago"
    },
    {
      id: "rem-902",
      action: "purge_docker_logs",
      target: "staging-api-gateway",
      status: "SUCCESS",
      duration: "3.11s",
      timestamp: "1 hour ago"
    }
  ]);

  // Simulate real-time metric streams
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate ingestion rate
      setIngestionRate(prev => Math.floor(prev + (Math.random() * 30 - 15)));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const triggerMockIngestion = () => {
    // Inject a new metric
    const hostnames = ["k8s-node-worker-02", "staging-api-gateway", "k8s-node-primary-01", "db-master-us-east"];
    const metrics = ["memory_leak_detected", "cpu_utilization", "network_rx_dropped", "disk_space_exhaustion"];
    
    const host = hostnames[Math.floor(Math.random() * hostnames.length)];
    const metric = metrics[Math.floor(Math.random() * metrics.length)];
    const val = Math.round((Math.random() * 50 + 50) * 10) / 10;
    
    const isAnomaly = val > 85;
    if (isAnomaly) {
      const newAnom: AnomalyEvent = {
        id: `anom-${Date.now().toString().slice(-4)}`,
        hostname: host,
        metric: metric,
        value: val,
        severity: val > 92 ? "CRITICAL" : "WARNING",
        timestamp: "Just Now",
        status: "ACTIVE"
      };
      setActiveAnomalies(prev => [newAnom, ...prev.slice(0, 4)]);
    }
  };

  const triggerRemediation = (anomalyId: string, action: string, target: string) => {
    // Mark anomaly as remediating
    setActiveAnomalies(prev =>
      prev.map(anom => (anom.id === anomalyId ? { ...anom, status: "REMEDIATING" } : anom))
    );

    const newRemId = `rem-${Date.now().toString().slice(-4)}`;
    
    // Add remediation logs in progress
    const newRem: RemediationLog = {
      id: newRemId,
      action: action,
      target: target,
      status: "IN_PROGRESS",
      duration: "Processing...",
      timestamp: "Just Now"
    };
    
    setRemediations(prev => [newRem, ...prev]);

    // Simulate completion
    setTimeout(() => {
      // Complete remediation log
      setRemediations(prev =>
        prev.map(rem =>
          rem.id === newRemId
            ? { ...rem, status: "SUCCESS", duration: `${(Math.random() * 2 + 1).toFixed(2)}s` }
            : rem
        )
      );

      // Resolve the anomaly
      setActiveAnomalies(prev => prev.filter(anom => anom.id !== anomalyId));
    }, 3000);
  };

  return (
    <div style={{ padding: "40px max(5vw, 24px)", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Banner Navigation */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "48px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "800", background: "linear-gradient(135deg, #fff 30%, #a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.03em", marginBottom: "8px" }}>
            NeuralOps Control Center
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>
            AI-driven cloud infrastructure anomaly telemetry & automated remediation
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", padding: "10px 20px", borderRadius: "30px" }}>
          <span className="pulse-dot"></span>
          <span style={{ fontSize: "0.9rem", fontWeight: "600", letterSpacing: "0.05em", color: "var(--success)" }}>
            ENGINE ONLINE & SHIELDED
          </span>
        </div>
      </header>

      {/* Grid Summary Statistics */}
      <section className="dashboard-grid">
        <div className="glass-card">
          <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Metric Ingestion Rate
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "baseline", gap: "8px" }}>
            {ingestionRate} <span style={{ fontSize: "1.1rem", color: "var(--cyan)", fontWeight: "500" }}>metrics/sec</span>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "12px" }}>
            Connected to Kafka topic <code style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>raw.metrics</code>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            ML Detection Accuracy
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "baseline", gap: "8px" }}>
            99.24% <span style={{ fontSize: "1.1rem", color: "var(--primary)", fontWeight: "500" }}>confidence</span>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "12px" }}>
            Model version: <span style={{ color: "var(--primary)" }}>anomaly_detection_v4.2</span>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Active System Anomalies
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: activeAnomalies.length > 0 ? "var(--danger)" : "var(--success)" }}>
            {activeAnomalies.length}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "12px" }}>
            Real-time event analysis in pipeline
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
              Simulator Tools
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "12px" }}>
              Simulate metric ingestion to generate load and test detectors.
            </p>
          </div>
          <button className="btn btn-primary" onClick={triggerMockIngestion}>
            Inject Telemetry Log
          </button>
        </div>
      </section>

      {/* Main Grid Panels */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "32px" }}>
        
        {/* Active Anomalies stream panel */}
        <div className="glass-card" style={{ minHeight: "450px" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "24px", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px" }}>
            🚨 Active Anomaly Detection Queue
          </h2>
          {activeAnomalies.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--text-secondary)" }}>
              <span style={{ fontSize: "3rem", marginBottom: "16px" }}>✓</span>
              <p style={{ fontWeight: "600" }}>All services operating securely</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No anomalies detected in the last 15 minutes.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {activeAnomalies.map((anom) => (
                <div key={anom.id} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s ease" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.75rem", background: anom.severity === "CRITICAL" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)", color: anom.severity === "CRITICAL" ? "var(--danger)" : "var(--warning)", border: "1px solid", borderColor: anom.severity === "CRITICAL" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
                        {anom.severity}
                      </span>
                      <strong style={{ color: "#fff", fontSize: "0.95rem" }}>{anom.hostname}</strong>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Metric <code style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>{anom.metric}</code> hit threshold with value <strong style={{ color: "#fff" }}>{anom.value}</strong>
                    </p>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Detected {anom.timestamp}</span>
                  </div>
                  <div>
                    {anom.status === "ACTIVE" ? (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                        onClick={() => triggerRemediation(
                          anom.id,
                          anom.metric === "cpu_utilization" ? "scale_out_deployment" : "purge_docker_logs",
                          anom.hostname
                        )}
                      >
                        Auto Remediation
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="pulse-dot" style={{ backgroundColor: "var(--primary)", boxShadow: "0 0 10px var(--primary)" }}></span>
                        Remediating...
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Remediation Audit Logs Panel */}
        <div className="glass-card" style={{ minHeight: "450px" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "24px", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px" }}>
            🛠️ Remediation Activity Log (Celery Pipeline)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {remediations.map((rem) => (
              <div key={rem.id} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <code style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
                      {rem.action}
                    </code>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>→</span>
                    <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: "600" }}>{rem.target}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Execution: <span style={{ color: "var(--text-secondary)" }}>{rem.duration}</span> | {rem.timestamp}
                  </div>
                </div>
                <div>
                  <span style={{
                    fontSize: "0.8rem",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontWeight: "600",
                    background: rem.status === "SUCCESS" ? "rgba(16, 185, 129, 0.12)" : rem.status === "IN_PROGRESS" ? "rgba(139, 92, 246, 0.12)" : "rgba(239, 68, 68, 0.12)",
                    color: rem.status === "SUCCESS" ? "var(--success)" : rem.status === "IN_PROGRESS" ? "var(--primary)" : "var(--danger)",
                    border: "1px solid",
                    borderColor: rem.status === "SUCCESS" ? "rgba(16, 185, 129, 0.3)" : rem.status === "IN_PROGRESS" ? "rgba(139, 92, 246, 0.3)" : "rgba(239, 68, 68, 0.3)"
                  }}>
                    {rem.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>
    </div>
  );
}
