'use client';

import { useEffect, useState } from 'react';

interface AiStatus {
  provider: string;
  model: string;
  connected: boolean;
  modelAvailable: boolean;
  error?: string;
}

export function OllamaStatusBanner() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/ai/status');
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) {
          setStatus({
            provider: 'ollama',
            model: 'llava',
            connected: false,
            modelAvailable: false,
            error: 'Could not reach AI status endpoint',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="ollama-status ollama-status-loading">Checking AI model...</div>;
  }

  if (!status) return null;

  const ready = status.connected && status.modelAvailable;

  return (
    <div className={`ollama-status ${ready ? 'ollama-status-ready' : 'ollama-status-error'}`}>
      <div className="ollama-status-row">
        <span className="ollama-status-label">
          {status.provider === 'gemini' ? 'Gemini' : 'Ollama'}: {status.model}
        </span>
        <span className={`ollama-status-dot ${ready ? 'ready' : 'error'}`} />
        <span className="ollama-status-text">
          {ready ? 'Ready' : status.error ?? 'Not ready'}
        </span>
      </div>
      {!ready && status.provider === 'ollama' && (
        <div className="ollama-setup-steps">
          <p>1. Install and start <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Ollama</a></p>
          <p>
            2. Run: <code>ollama pull {status.model.replace(/:latest$/, '')}</code>
          </p>
          <p>3. Set <code>AI_PROVIDER=ollama</code> in <code>.env.local</code></p>
        </div>
      )}
    </div>
  );
}
