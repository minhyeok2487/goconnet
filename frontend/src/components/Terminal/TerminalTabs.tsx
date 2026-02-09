import { useState, useRef, useEffect } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';

interface ContextMenu {
  x: number;
  y: number;
  tabId: string;
}

export default function TerminalTabs() {
  const tabs = useConnectionStore((s) => s.tabs);
  const activeTabId = useConnectionStore((s) => s.activeTabId);
  const setActiveTab = useConnectionStore((s) => s.setActiveTab);
  const closeTab = useConnectionStore((s) => s.closeTab);
  const duplicateTab = useConnectionStore((s) => s.duplicateTab);
  const renameTab = useConnectionStore((s) => s.renameTab);

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // Focus rename input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const handleRenameSubmit = () => {
    if (renamingId && renameValue.trim()) {
      renameTab(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const closeTabsToLeft = (tabId: string) => {
    const idx = tabs.findIndex((t) => t.id === tabId);
    tabs.slice(0, idx).forEach((t) => closeTab(t.id));
  };

  const closeTabsToRight = (tabId: string) => {
    const idx = tabs.findIndex((t) => t.id === tabId);
    tabs.slice(idx + 1).forEach((t) => closeTab(t.id));
  };

  const closeOtherTabs = (tabId: string) => {
    tabs.filter((t) => t.id !== tabId).forEach((t) => closeTab(t.id));
  };

  if (tabs.length === 0) {
    return (
      <div className="h-9 bg-tab-bg border-b border-border-color flex items-center px-3 text-text-secondary text-xs">
        No active connections. Double-click a session to connect.
      </div>
    );
  }

  return (
    <>
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
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
          >
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              tab.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            {renamingId === tab.id ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#3c3c3c', color: '#ccc', border: '1px solid #007acc',
                  borderRadius: 2, padding: '0 4px', fontSize: 12, width: 120, outline: 'none',
                }}
              />
            ) : (
              <span>{tab.label}</span>
            )}
            <button
              className="ml-2 text-text-secondary hover:text-white hover:bg-red-600 rounded px-1"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              title="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 300,
            background: '#252526',
            border: '1px solid #3c3c3c',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            minWidth: 180,
            padding: '4px 0',
          }}
        >
          {[
            { label: 'Duplicate Tab', action: () => duplicateTab(contextMenu.tabId) },
            { label: 'Rename Tab', action: () => {
              const tab = tabs.find((t) => t.id === contextMenu.tabId);
              setRenameValue(tab?.label || '');
              setRenamingId(contextMenu.tabId);
            }},
            { label: '---' },
            { label: 'Close Tab', action: () => closeTab(contextMenu.tabId) },
            { label: 'Close Others', action: () => closeOtherTabs(contextMenu.tabId) },
            { label: 'Close Tabs to Left', action: () => closeTabsToLeft(contextMenu.tabId) },
            { label: 'Close Tabs to Right', action: () => closeTabsToRight(contextMenu.tabId) },
          ].map((item, i) =>
            item.label === '---' ? (
              <div key={i} style={{ borderTop: '1px solid #3c3c3c', margin: '4px 0' }} />
            ) : (
              <button
                key={i}
                onClick={() => { item.action?.(); setContextMenu(null); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', color: '#ccc',
                  padding: '6px 16px', cursor: 'pointer', fontSize: 12,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#094771')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}
