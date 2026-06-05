import React from 'react';
import { Sparkles } from 'lucide-react';
import { isClaudeProvider } from '../../utils/brainAnalysis.js';

/** Cyan Claude badge shown when analysis is powered by Anthropic */
const BrainClaudeBadge = ({ provider, aiEnabled, compact = false, className = '' }) => {
  if (!isClaudeProvider(provider, aiEnabled)) return null;
  return (
    <span className={`brain-claude-badge ${compact ? 'brain-claude-badge--compact' : ''} ${className}`.trim()}>
      <Sparkles size={compact ? 9 : 10} aria-hidden />
      Claude
    </span>
  );
};

export default BrainClaudeBadge;
