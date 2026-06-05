import React from 'react';
import { isClaudeProvider, providerLabel } from '../../utils/brainAnalysis.js';

const BrainProviderFoot = ({ provider, aiEnabled, model, aiError, claudeConfigured }) => {
  if (isClaudeProvider(provider, aiEnabled)) {
    return (
      <p className="brain-provider-foot">
        Powered by Claude
        {model ? ` · ${model}` : ''}
        {' · live desk tape'}
      </p>
    );
  }

  if (aiError) {
    return (
      <p className="brain-provider-foot brain-provider-foot--warn">
        Claude unavailable ({aiError}) · showing {providerLabel(provider)}
      </p>
    );
  }

  if (claudeConfigured === false) {
    return (
      <p className="brain-provider-foot brain-provider-foot--hint">
        Add ANTHROPIC_API_KEY to .env and restart the API for Claude desk reads
      </p>
    );
  }

  return <p className="brain-provider-foot">{providerLabel(provider, aiEnabled)} · calendar + live tape</p>;
};

export default BrainProviderFoot;
