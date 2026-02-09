import { useState, useEffect } from 'react';
import { useConnectionStore } from '../stores/connectionStore';

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function StatusBar() {
  const statusText = useConnectionStore((s) => s.statusText);
  const tabs = useConnectionStore((s) => s.tabs);
  const activeTabId = useConnectionStore((s) => s.activeTabId);
  const activeTabs = tabs.filter((t) => t.isConnected);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [now, setNow] = useState(Date.now());

  // Update uptime every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const uptime = activeTab?.connectedAt && activeTab.isConnected
    ? formatUptime(now - activeTab.connectedAt)
    : null;

  return (
    <div className="h-6 bg-status-bar text-white flex items-center px-3 text-xs select-none justify-between">
      <span>{statusText}</span>
      <div style={{ display: 'flex', gap: 12 }}>
        {uptime && (
          <span style={{ color: '#4ec9b0' }}>Uptime: {uptime}</span>
        )}
        <span>{activeTabs.length > 0 ? `${activeTabs.length} connection(s)` : ''}</span>
      </div>
    </div>
  );
}
