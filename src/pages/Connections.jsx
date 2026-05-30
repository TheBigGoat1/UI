import React, { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, KeyRound, Link2, RefreshCw } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import DashSelect from "../components/ui/DashSelect.jsx";
import { api } from "../services/api/api";
import { SUPPORTED_EXCHANGES } from "../services/tradingSystem/exchanges";
import { connectExchange, runSync } from "../services/tradingSystem/syncEngine";
import { systemStorage } from "../services/tradingSystem/storage";

const Connections = () => {
  const [form, setForm] = useState({
    exchangeId: "binance",
    apiKey: "",
    apiSecret: "",
    passphrase: "",
  });
  const [connections, setConnections] = useState(systemStorage.getConnections());
  const [syncRuns, setSyncRuns] = useState(systemStorage.getSyncRuns());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const activeExchange = useMemo(
    () => SUPPORTED_EXCHANGES.find((exchange) => exchange.id === form.exchangeId),
    [form.exchangeId],
  );

  const loadConnections = async () => {
    try {
      const res = await api.connections.list();
      if (res?.success && Array.isArray(res.data)) {
        setConnections(res.data);
        return;
      }
    } catch {
      // fallback below
    }
    setConnections(systemStorage.getConnections());
    setSyncRuns(systemStorage.getSyncRuns());
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const onConnect = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await api.connections.connect(form);
      if (res?.success) {
        setMessage(`${activeExchange?.label} connected (saved to PostgreSQL).`);
        setForm((prev) => ({ ...prev, apiKey: "", apiSecret: "", passphrase: "" }));
        await loadConnections();
        setBusy(false);
        return;
      }
    } catch {
      // fallback to local engine
    }

    const result = await connectExchange(form);
    if (result.success) {
      setMessage(`${activeExchange?.label} connected (local fallback).`);
      setForm((prev) => ({ ...prev, apiKey: "", apiSecret: "", passphrase: "" }));
      await loadConnections();
    } else {
      setMessage(result.error || "Connection failed.");
    }
    setBusy(false);
  };

  const onSync = async (exchangeId) => {
    setBusy(true);
    setMessage("");
    try {
      const res = await api.connections.sync(exchangeId);
      if (res?.success) {
        setMessage("Sync completed — trades stored in PostgreSQL.");
        setBusy(false);
        return;
      }
    } catch {
      // fallback
    }

    const result = await runSync(exchangeId);
    setMessage(result.success ? "Sync completed (local fallback)." : result.error);
    await loadConnections();
    setBusy(false);
  };

  return (
    <div className="dash-page max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={Link2}
        title="Exchange Connections"
        description="Connect Binance, Bybit, and OKX. Trigger syncs to feed the journal and analytics engine."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={onConnect} className="card-modern p-6 space-y-4">
          <h3 className="font-semibold text-text-main flex items-center gap-2">
            <KeyRound size={16} className="text-primary" />
            Connect Exchange
          </h3>

          <DashSelect
            label="Exchange"
            value={form.exchangeId}
            onChange={(event) => setForm((prev) => ({ ...prev, exchangeId: event.target.value }))}
            options={SUPPORTED_EXCHANGES.map((exchange) => ({
              value: exchange.id,
              label: exchange.label,
            }))}
          />

          <label className="block text-sm text-text-muted">API Key</label>
          <input
            type="password"
            value={form.apiKey}
            onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))}
            className="w-full bg-background border border-border rounded px-3 py-2 text-text-main"
            required
          />

          <label className="block text-sm text-text-muted">API Secret</label>
          <input
            type="password"
            value={form.apiSecret}
            onChange={(event) => setForm((prev) => ({ ...prev, apiSecret: event.target.value }))}
            className="w-full bg-background border border-border rounded px-3 py-2 text-text-main"
            required
          />

          {activeExchange?.requiresPassphrase && (
            <>
              <label className="block text-sm text-text-muted">Passphrase</label>
              <input
                type="password"
                value={form.passphrase}
                onChange={(event) => setForm((prev) => ({ ...prev, passphrase: event.target.value }))}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main"
                required
              />
            </>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
            <Activity size={15} /> {busy ? "Processing..." : "Validate and Connect"}
          </button>
          {message && <p className="text-xs text-text-muted">{message}</p>}
        </form>

        <div className="card-modern p-6 space-y-4">
          <h3 className="font-semibold text-text-main">Where to get API keys</h3>
          {SUPPORTED_EXCHANGES.map((exchange) => (
            <a
              key={exchange.id}
              href={exchange.keyHelpUrl}
              target="_blank"
              rel="noreferrer"
              className="block p-3 rounded border border-border hover:border-primary/40 hover:bg-background/50 transition-colors"
            >
              <p className="text-sm font-bold text-text-main">{exchange.label}</p>
              <p className="text-xs text-text-muted">{exchange.keyHelpUrl}</p>
            </a>
          ))}
          <p className="text-xs text-text-muted">
            Use read-only permissions for journal sync (balances/orders/trades). Do not enable withdrawals.
          </p>
        </div>
      </div>

      <div className="card-modern p-6">
        <h3 className="font-semibold text-text-main mb-4">Connected Exchanges</h3>
        <div className="space-y-3">
          {connections.length ? (
            connections.map((connection) => (
              <div
                key={connection.id}
                className="p-4 rounded-xl border border-border bg-background/30 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-text-main flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {connection.exchangeName}
                  </p>
                  <p className="text-xs text-text-muted">Key: {connection.apiKeyMasked}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSync(connection.exchangeId)}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-surface-hover text-sm font-semibold flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Run Sync
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-muted">No exchange connection yet.</p>
          )}
        </div>
      </div>

      <div className="card-modern p-6">
        <h3 className="font-semibold text-text-main mb-4">Recent Sync Activity</h3>
        {syncRuns.length ? (
          <div className="space-y-2">
            {syncRuns.slice(0, 8).map((run) => (
              <div key={run.id} className="text-sm text-text-muted border-b border-border/60 pb-2">
                {run.exchangeId.toUpperCase()} - {run.status} - {run.insertedTrades} trades -{" "}
                {new Date(run.createdAt).toLocaleString()}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No sync runs yet.</p>
        )}
      </div>
    </div>
  );
};

export default Connections;
