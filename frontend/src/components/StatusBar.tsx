import { useConnectionStore } from '../stores/connectionStore';

export default function StatusBar() {
  const statusText = useConnectionStore((s) => s.statusText);
  const tabs = useConnectionStore((s) => s.tabs);
  const activeTabs = tabs.filter((t) => t.isConnected);

  return (
    <div className="h-6 bg-status-bar text-white flex items-center px-3 text-xs select-none justify-between">
      <span>{statusText}</span>
      <span>{activeTabs.length > 0 ? `${activeTabs.length} connection(s)` : ''}</span>
    </div>
  );
}
