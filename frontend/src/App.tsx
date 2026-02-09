import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import TerminalTabs from './components/Terminal/TerminalTabs';
import TerminalPane from './components/Terminal/TerminalPane';
import SessionEditDialog from './components/Dialogs/SessionEditDialog';
import StatusBar from './components/StatusBar';
import { useConnectionStore } from './stores/connectionStore';
import type { Session } from './types';

function App() {
  const tabs = useConnectionStore((s) => s.tabs);
  const activeTabId = useConnectionStore((s) => s.activeTabId);
  const closeTab = useConnectionStore((s) => s.closeTab);
  const setActiveTab = useConnectionStore((s) => s.setActiveTab);

  const [editingSession, setEditingSession] = useState<Session | undefined>();
  const [showDialog, setShowDialog] = useState(false);

  const handleEditSession = useCallback((session?: Session) => {
    setEditingSession(session);
    setShowDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setShowDialog(false);
    setEditingSession(undefined);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        handleEditSession();
      }
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        if (tabs.length > 1 && activeTabId) {
          const idx = tabs.findIndex((t) => t.id === activeTabId);
          const next = tabs[(idx + 1) % tabs.length];
          setActiveTab(next.id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabId, tabs, closeTab, setActiveTab, handleEditSession]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar onEditSession={handleEditSession} />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <TerminalTabs />

          {/* Terminal area */}
          <div className="flex-1 bg-app-bg relative">
            {tabs.length === 0 && (
              <div className="flex items-center justify-center h-full text-text-secondary">
                <div className="text-center">
                  <div className="text-4xl mb-4">GoConnect</div>
                  <div className="text-sm">Double-click a session to connect, or press Ctrl+T to create one</div>
                  <div className="text-xs mt-2 text-text-secondary">
                    SSH | Telnet | RDP - Unlimited sessions
                  </div>
                </div>
              </div>
            )}
            {tabs.map((tab) => (
              <TerminalPane
                key={tab.id}
                connId={tab.id}
                isActive={tab.id === activeTabId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Session edit dialog */}
      {showDialog && (
        <SessionEditDialog
          session={editingSession}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
}

export default App;
