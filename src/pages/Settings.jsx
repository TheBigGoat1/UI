import React, { useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import ThemeToggle from '../components/theme/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Cpu, 
  Save, 
  ToggleLeft, 
  ToggleRight,
  AlertTriangle,
  Activity
} from 'lucide-react';

const Settings = () => {
  const { theme, isDark } = useTheme();

  // Risk Preferences (Local State for Calculator)
  const [riskSettings, setRiskSettings] = useState({
    maxAccountRisk: 2.0,
    dailyDrawdownLimit: 5.0,
    maxOpenPositions: 3
  });

  // Technical Engine Modules (Mapped from backend constructor)
  const [engineModules, setEngineModules] = useState({
    marketStructure: true,
    supportResistance: true,
    orderBlocks: true,
    pocLevels: true,
    psychologicalLevels: true,
    harmonics: true,
    liquidity: true,
    sma: true,
    fibonacci: true,
    rsiDivergence: true
  });

  const formatLabel = (key) => {
    let result = key.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  // Toggle Switch Component
  const Toggle = ({ active, onClick, label }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <button 
        onClick={onClick}
        className={`transition-colors ${active ? 'text-emerald-500' : 'text-text-muted hover:text-text-main'}`}
      >
        {active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </div>
  );

  return (
    <div className="dash-page max-w-4xl mx-auto space-y-8 pb-10">
      <PageHeader
        icon={SettingsIcon}
        title="System Configuration"
        description="Manage risk parameters and active analysis modules."
      />

      <div className="card-modern p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-text-main">Appearance</h2>
          <p className="text-sm text-text-muted mt-1">
            {isDark ? 'Dark mode is on. Switch to light for a brighter workspace.' : 'Light mode is on. Switch to dark for the classic terminal look.'}
          </p>
          <p className="text-xs text-text-muted mt-2 capitalize">Active: {theme} mode</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SECTION 1: Risk Management */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden h-fit md:col-span-2 lg:col-span-1">
          <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
            <Shield size={18} className="text-emerald-500" />
            <h2 className="font-semibold text-text-main">Risk Parameters</h2>
          </div>
          
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs text-text-muted mb-1 font-bold uppercase tracking-wider">Max Risk Per Trade (%)</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  step="0.1"
                  value={riskSettings.maxAccountRisk}
                  onChange={(e) => setRiskSettings({...riskSettings, maxAccountRisk: e.target.value})}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1 font-bold uppercase tracking-wider">Daily Drawdown Limit (%)</label>
              <input 
                type="number" 
                value={riskSettings.dailyDrawdownLimit}
                onChange={(e) => setRiskSettings({...riskSettings, dailyDrawdownLimit: e.target.value})}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:border-primary outline-none transition-colors"
              />
            </div>

            <div className="pt-2">
               <button className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded flex items-center justify-center gap-2 transition-colors font-bold text-sm">
                 <Save size={16} /> Save Preferences
               </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: Technical Engine Modules */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden md:col-span-2 lg:col-span-1">
          <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
            <Activity size={18} className="text-purple-500" />
            <h2 className="font-semibold text-text-main">Technical Analysis Modules</h2>
          </div>
          <div className="p-4 grid grid-cols-1 gap-x-8">
            {Object.entries(engineModules).map(([key, isActive]) => (
              <Toggle 
                key={key}
                label={formatLabel(key)}
                active={isActive}
                onClick={() => setEngineModules(prev => ({...prev, [key]: !prev[key]}))}
              />
            ))}
          </div>
        </div>

        {/* SECTION 3: Danger Zone */}
        <div className="md:col-span-2 bg-red-500/5 border border-red-500/20 rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-full">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <div>
              <h3 className="text-red-500 font-bold text-lg">Emergency Flatten</h3>
              <p className="text-xs text-text-muted mt-1">Instantly close all open positions and cancel pending orders.</p>
            </div>
          </div>
          <button className="w-full md:w-auto px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded shadow-lg shadow-red-500/20 transition-all">
            FLATTEN ALL
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;