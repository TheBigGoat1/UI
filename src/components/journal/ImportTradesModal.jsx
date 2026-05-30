import React, { useRef, useState } from 'react';
import { AlertTriangle, Download, FileUp, Loader2, X } from 'lucide-react';
import { downloadCsv } from '../../utils/exportCsv.js';

const CSV_TEMPLATE = [
  ['symbol', 'side', 'pnl', 'strategy', 'emotion', 'status', 'opened_at'],
  ['BTCUSD', 'long', '125.50', 'Breakout', 'Following the plan', 'WIN', '2025-01-15'],
  ['EURUSD', 'short', '-45.00', 'Reversal', 'FOMO', 'LOSS', '2025-01-16'],
];

const ImportTradesModal = ({ open, onClose, onImport, importing }) => {
  const fileRef = useRef(null);
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ''));
    };
    reader.onerror = () => setError('Could not read file.');
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    downloadCsv('insidr-journal-import-template.csv', CSV_TEMPLATE);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!csvText.trim()) {
      setError('Paste CSV content or choose a file.');
      return;
    }
    const result = await onImport(csvText);
    if (result?.success) {
      setCsvText('');
      if (fileRef.current) fileRef.current.value = '';
      onClose();
    } else {
      setError(result?.error || 'Import failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg dash-panel p-6 space-y-4 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
              <FileUp size={18} className="text-primary" /> Import trades from CSV
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Required columns: <span className="font-mono">symbol</span>,{' '}
              <span className="font-mono">pnl</span>. Optional: side, strategy, emotion, status, opened_at.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          Duplicates are skipped automatically (same symbol, side, P&amp;L, exchange, and date).
        </div>

        <button
          type="button"
          onClick={downloadTemplate}
          className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
        >
          <Download size={12} /> Download template CSV
        </button>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-border file:bg-background file:text-text-main"
          />

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={8}
            placeholder="symbol,side,pnl,strategy&#10;BTCUSD,long,120,Breakout"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-main outline-none focus:border-primary"
          />

          {error && (
            <p className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm px-4 py-2">
              Cancel
            </button>
            <button
              type="submit"
              disabled={importing}
              className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              Import trades
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportTradesModal;
