import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import TerminalTabs from './components/Terminal/TerminalTabs';
import TerminalPane from './components/Terminal/TerminalPane';
import SessionEditDialog from './components/Dialogs/SessionEditDialog';
import StatusBar from './components/StatusBar';
import MultiExec from './components/Terminal/MultiExec';
import SettingsDialog from './components/Dialogs/SettingsDialog';
import QuickConnectDialog from './components/Dialogs/QuickConnectDialog';
import MacroDialog from './components/Dialogs/MacroDialog';
import { useSettingsStore } from './stores/settingsStore';
import { useConnectionStore } from './stores/connectionStore';
import type { Session } from './types';

type SplitMode = 'single' | 'vertical' | 'horizontal' | 'quad';

function App() {
  const tabs = useConnectionStore((s) => s.tabs);
  const activeTabId = useConnectionStore((s) => s.activeTabId);
  const closeTab = useConnectionStore((s) => s.closeTab);
  const setActiveTab = useConnectionStore((s) => s.setActiveTab);

  const [editingSession, setEditingSession] = useState<Session | undefined>();
  const [showDialog, setShowDialog] = useState(false);
  const [splitMode, setSplitMode] = useState<SplitMode>('single');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showMultiExec, setShowMultiExec] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  // Load settings on mount
  useEffect(() => { loadSettings(); }, []);

  const handleEditSession = useCallback((session?: Session) => {
    setEditingSession(session);
    setShowDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setShowDialog(false);
    setEditingSession(undefined);
  }, []);

  // Get tabs to display in split panes
  const getSplitTabs = () => {
    if (tabs.length === 0) return [];
    const activeIdx = tabs.findIndex((t) => t.id === activeTabId);
    const startIdx = Math.max(0, activeIdx);
    switch (splitMode) {
      case 'vertical':
      case 'horizontal':
        return tabs.slice(startIdx, startIdx + 2);
      case 'quad':
        return tabs.slice(startIdx, startIdx + 4);
      default:
        return activeTabId ? [tabs.find((t) => t.id === activeTabId)!].filter(Boolean) : [];
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 't') {
        e.preventDefault();
        handleEditSession();
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        if (tabs.length > 1 && activeTabId) {
          const idx = tabs.findIndex((t) => t.id === activeTabId);
          const next = tabs[(idx + 1) % tabs.length];
          setActiveTab(next.id);
        }
      }
      // Split mode shortcuts
      if (e.ctrlKey && e.shiftKey && e.key === '!') { e.preventDefault(); setSplitMode('single'); }
      if (e.ctrlKey && e.shiftKey && e.key === '@') { e.preventDefault(); setSplitMode('vertical'); }
      if (e.ctrlKey && e.shiftKey && e.key === '#') { e.preventDefault(); setSplitMode('horizontal'); }
      if (e.ctrlKey && e.shiftKey && e.key === '$') { e.preventDefault(); setSplitMode('quad'); }
      // Sidebar toggle
      if (e.ctrlKey && e.shiftKey && e.key === 'B') { e.preventDefault(); setSidebarVisible((v) => !v); }
      // Multi-execution toggle
      if (e.ctrlKey && e.shiftKey && e.key === 'M') { e.preventDefault(); setShowMultiExec((v) => !v); }
      // Settings dialog
      if (e.ctrlKey && e.key === ',') { e.preventDefault(); setShowSettings(true); }
      // Quick Connect
      if (e.ctrlKey && e.shiftKey && e.key === 'Q') { e.preventDefault(); setShowQuickConnect(true); }
      // Macros
      if (e.ctrlKey && e.shiftKey && e.key === 'R') { e.preventDefault(); setShowMacros(true); }
      // Fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabId, tabs, closeTab, setActiveTab, handleEditSession]);

  const splitTabs = getSplitTabs();

  const renderSplitLayout = () => {
    if (tabs.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-text-secondary">
          <div className="text-center">
            <div className="text-4xl mb-4">GoConnect</div>
            <div className="text-sm">Double-click a session to connect, or press Ctrl+T to create one</div>
            <div className="text-xs mt-2 text-text-secondary">
              SSH | Telnet | RDP | Serial - Unlimited sessions
            </div>
          </div>
        </div>
      );
    }

    if (splitMode === 'single') {
      return tabs.map((tab) => (
        <TerminalPane key={tab.id} connId={tab.id} isActive={tab.id === activeTabId} />
      ));
    }

    const isVertical = splitMode === 'vertical';
    const isQuad = splitMode === 'quad';

    if (isQuad) {
      const panes = splitTabs.slice(0, 4);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ flex: 1, position: 'relative', borderRight: i === 0 ? '1px solid #333' : 'none', borderBottom: '1px solid #333' }} onClick={() => panes[i] && setActiveTab(panes[i].id)}>
                {panes[i] && <TerminalPane connId={panes[i].id} isActive={panes[i].id === activeTabId} visible={true} />}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {[2, 3].map((i) => (
              <div key={i} style={{ flex: 1, position: 'relative', borderRight: i === 2 ? '1px solid #333' : 'none' }} onClick={() => panes[i] && setActiveTab(panes[i].id)}>
                {panes[i] && <TerminalPane connId={panes[i].id} isActive={panes[i].id === activeTabId} visible={true} />}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Vertical or horizontal split (2 panes)
    const panes = splitTabs.slice(0, 2);
    return (
      <div style={{
        display: 'flex',
        flexDirection: isVertical ? 'row' : 'column',
        height: '100%',
        width: '100%',
      }}>
        {panes.map((tab, i) => (
          <div
            key={tab.id}
            style={{
              flex: 1,
              position: 'relative',
              borderRight: isVertical && i === 0 ? '1px solid #333' : 'none',
              borderBottom: !isVertical && i === 0 ? '1px solid #333' : 'none',
              minWidth: 0,
              minHeight: 0,
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <TerminalPane connId={tab.id} isActive={tab.id === activeTabId} visible={true} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarVisible && <Sidebar onEditSession={handleEditSession} />}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar with split controls */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <TerminalTabs />
            </div>
            {tabs.length > 0 && (
              <div style={{ display: 'flex', gap: 2, padding: '0 8px', background: '#252526', height: 36, alignItems: 'center' }}>
                <button
                  onClick={() => setSplitMode('single')}
                  title="Single (Ctrl+Shift+1)"
                  style={{ background: splitMode === 'single' ? '#094771' : 'transparent', color: '#ccc', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}
                >
                  &#9744;
                </button>
                <button
                  onClick={() => setSplitMode('vertical')}
                  title="Vertical Split (Ctrl+Shift+2)"
                  style={{ background: splitMode === 'vertical' ? '#094771' : 'transparent', color: '#ccc', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}
                >
                  &#9645;&#9645;
                </button>
                <button
                  onClick={() => setSplitMode('horizontal')}
                  title="Horizontal Split (Ctrl+Shift+3)"
                  style={{ background: splitMode === 'horizontal' ? '#094771' : 'transparent', color: '#ccc', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}
                >
                  &#9643;<br/>&#9643;
                </button>
                <button
                  onClick={() => setSplitMode('quad')}
                  title="Quad Split (Ctrl+Shift+4)"
                  style={{ background: splitMode === 'quad' ? '#094771' : 'transparent', color: '#ccc', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}
                >
                  &#9638;
                </button>
              </div>
            )}
          </div>

          {/* Terminal area */}
          <div className="flex-1 bg-app-bg relative">
            {renderSplitLayout()}
          </div>
        </div>
      </div>

      {/* Multi-execution panel */}
      <MultiExec visible={showMultiExec} onClose={() => setShowMultiExec(false)} />

      {/* Status bar */}
      <StatusBar />

      {/* Session edit dialog */}
      {showDialog && (
        <SessionEditDialog
          session={editingSession}
          onClose={handleCloseDialog}
        />
      )}

      {/* Settings dialog */}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}

      {/* Quick Connect dialog */}
      {showQuickConnect && <QuickConnectDialog onClose={() => setShowQuickConnect(false)} />}

      {/* Macro dialog */}
      {showMacros && <MacroDialog onClose={() => setShowMacros(false)} />}
    </div>
  );
}

export default App;
