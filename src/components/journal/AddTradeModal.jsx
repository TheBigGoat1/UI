import React, { useState } from "react";
import { X } from "lucide-react";

const ASSETS = [
  "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD", "ETHUSD", "US500", "NAS100",
];

export default function AddTradeModal({ open, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    asset: "EURUSD",
    type: "LONG",
    pnl: "",
    strategy: "Manual",
    emotion: "Calm",
  });

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      asset: form.asset,
      type: form.type,
      pnl: parseFloat(form.pnl) || 0,
      strategy: form.strategy,
      emotion: form.emotion,
      mistakes: [],
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg text-text-main">Log trade</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-main p-1">
            <X size={20} />
          </button>
        </div>

        <label className="block text-xs font-bold text-text-muted uppercase">
          Asset
          <select
            value={form.asset}
            onChange={(e) => setForm((f) => ({ ...f, asset: e.target.value }))}
            className="dash-select mt-1"
          >
            {ASSETS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-text-muted uppercase">
            Side
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="dash-select mt-1"
            >
              <option value="LONG">Long</option>
              <option value="SHORT">Short</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-text-muted uppercase">
            P&L ($)
            <input
              type="number"
              step="0.01"
              required
              value={form.pnl}
              onChange={(e) => setForm((f) => ({ ...f, pnl: e.target.value }))}
              className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="125.50"
            />
          </label>
        </div>

        <label className="block text-xs font-bold text-text-muted uppercase">
          Strategy
          <input
            value={form.strategy}
            onChange={(e) => setForm((f) => ({ ...f, strategy: e.target.value }))}
            className="dash-select mt-1"
          />
        </label>

        <label className="block text-xs font-bold text-text-muted uppercase">
          Emotion
          <select
            value={form.emotion}
            onChange={(e) => setForm((f) => ({ ...f, emotion: e.target.value }))}
            className="dash-select mt-1"
          >
            {["Calm", "FOMO", "Anxious", "Overconfident"].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-bold text-text-muted">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
            {saving ? "Saving…" : "Save trade"}
          </button>
        </div>
      </form>
    </div>
  );
}
