import { useConnectionStore } from '../../stores/connectionStore';

export default function TerminalTabs() {
  const tabs = useConnectionStore((s) => s.tabs);
  const activeTabId = useConnectionStore((s) => s.activeTabId);
  const setActiveTab = useConnectionStore((s) => s.setActiveTab);
  const closeTab = useConnectionStore((s) => s.closeTab);

  if (tabs.length === 0) {
    return (
      <div className="h-9 bg-tab-bg border-b border-border-color flex items-center px-3 text-text-secondary text-xs">
        No active connections. Double-click a session to connect.
      </div>
    );
  }

  return (
    <div className="h-9 bg-tab-bg border-b border-border-color flex items-center overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center h-full px-3 cursor-pointer border-r border-border-color text-xs select-none whitespace-nowrap ${
            tab.id === activeTabId
              ? 'bg-tab-active text-text-primary border-t-2 border-t-accent'
              : 'text-text-secondary hover:bg-hover-bg'
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
            tab.isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>{tab.label}</span>
          <button
            className="ml-2 text-text-secondary hover:text-white hover:bg-red-600 rounded px-1"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            title="Close tab"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
