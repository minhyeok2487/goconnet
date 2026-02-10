import { useEffect, useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useConnectionStore } from '../../stores/connectionStore';
import type { Session, Folder } from '../../types';

const wailsCall = (method: string, ...args: any[]) => {
  return (window as any)['go']['main']['App'][method](...args);
};

interface SidebarProps {
  onEditSession: (session?: Session) => void;
  onOpenSettings?: () => void;
  onOpenQuickConnect?: () => void;
  onOpenMacros?: () => void;
  onOpenTunnels?: () => void;
  onOpenShortcuts?: () => void;
  onToggleMultiExec?: () => void;
}

export default function Sidebar({ onEditSession, onOpenSettings, onOpenQuickConnect, onOpenMacros, onOpenTunnels, onOpenShortcuts, onToggleMultiExec }: SidebarProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const folders = useSessionStore((s) => s.folders);
  const searchQuery = useSessionStore((s) => s.searchQuery);
  const setSearchQuery = useSessionStore((s) => s.setSearchQuery);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const loadFolders = useSessionStore((s) => s.loadFolders);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const createFolder = useSessionStore((s) => s.createFolder);
  const deleteFolder = useSessionStore((s) => s.deleteFolder);

  const connectSSH = useConnectionStore((s) => s.connectSSH);
  const connectTelnet = useConnectionStore((s) => s.connectTelnet);
  const connectSerial = useConnectionStore((s) => s.connectSerial);
  const connectRDP = useConnectionStore((s) => s.connectRDP);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: string; id?: string } | null>(null);

  useEffect(() => {
    loadSessions();
    loadFolders();
  }, []);

  const filteredSessions = searchQuery
    ? sessions.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.host.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions;

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConnect = async (session: Session) => {
    try {
      switch (session.protocol) {
        case 'ssh':
          await connectSSH(session.id, session.name, 80, 24);
          break;
        case 'telnet':
          await connectTelnet(session.id, session.name, 80, 24);
          break;
        case 'serial':
          await connectSerial(session.id, session.name);
          break;
        case 'rdp':
          await connectRDP(session.id);
          break;
      }
    } catch (e: any) {
      alert(`Connection failed: ${e.message || e}`);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: string, id?: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleNewFolder = async () => {
    const name = prompt('Folder name:');
    if (name) {
      await createFolder({ name, parentId: '' });
    }
    closeContextMenu();
  };

  const protocolIcon = (protocol: string) => {
    switch (protocol) {
      case 'ssh': return '🔒';
      case 'telnet': return '📡';
      case 'serial': return '🔌';
      case 'rdp': return '🖥️';
      default: return '📌';
    }
  };

  // Group sessions by folder
  const rootSessions = filteredSessions.filter((s) => !s.folderId);
  const folderMap = new Map<string, Session[]>();
  filteredSessions.forEach((s) => {
    if (s.folderId) {
      const arr = folderMap.get(s.folderId) || [];
      arr.push(s);
      folderMap.set(s.folderId, arr);
    }
  });

  return (
    <div
      className="w-60 bg-sidebar-bg border-r border-border-color flex flex-col h-full select-none"
      onClick={closeContextMenu}
    >
      {/* Header */}
      <div className="p-2 border-b border-border-color flex items-center justify-between">
        <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">Sessions</span>
        <div className="flex gap-1">
          <button
            onClick={handleNewFolder}
            className="text-text-secondary hover:text-white px-1"
            title="New Folder"
          >
            📁+
          </button>
          <button
            onClick={() => onEditSession()}
            className="text-text-secondary hover:text-white px-1"
            title="New Session"
          >
            ＋
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border-color">
        <input
          type="text"
          placeholder="Search sessions..."
          className="w-full bg-app-bg text-text-primary text-xs px-2 py-1 rounded border border-border-color focus:border-accent focus:outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Session Tree */}
      <div className="flex-1 overflow-y-auto p-1">
        {/* Folders */}
        {folders.map((folder) => (
          <div key={folder.id}>
            <div
              className="flex items-center px-2 py-1 text-xs cursor-pointer hover:bg-hover-bg rounded"
              onClick={() => toggleFolder(folder.id)}
              onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
            >
              <span className="mr-1">{expandedFolders.has(folder.id) ? '▼' : '▶'}</span>
              <span className="mr-1">📁</span>
              <span className="text-text-primary">{folder.name}</span>
              <span className="ml-auto text-text-secondary">{(folderMap.get(folder.id) || []).length}</span>
            </div>
            {expandedFolders.has(folder.id) && (
              <div className="ml-4">
                {(folderMap.get(folder.id) || []).map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    onConnect={handleConnect}
                    onEdit={onEditSession}
                    onDelete={deleteSession}
                    onContextMenu={handleContextMenu}
                    protocolIcon={protocolIcon}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Root sessions (no folder) */}
        {rootSessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            onConnect={handleConnect}
            onEdit={onEditSession}
            onDelete={deleteSession}
            onContextMenu={handleContextMenu}
            protocolIcon={protocolIcon}
          />
        ))}

        {filteredSessions.length === 0 && (
          <div className="text-text-secondary text-xs text-center mt-4 px-2">
            {searchQuery ? 'No matching sessions.' : 'No sessions yet. Click + to create one.'}
          </div>
        )}
      </div>

      {/* Feature Toolbar */}
      <div className="px-2 pt-2 border-t border-border-color">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={onOpenQuickConnect}
            className="flex flex-col items-center justify-center py-1 text-text-secondary hover:text-white hover:bg-hover-bg rounded text-[10px] leading-tight"
            title="Quick Connect (Ctrl+Shift+Q)"
          >
            <span style={{ fontSize: 14 }}>⚡</span>
            <span>Quick</span>
          </button>
          <button
            onClick={onOpenMacros}
            className="flex flex-col items-center justify-center py-1 text-text-secondary hover:text-white hover:bg-hover-bg rounded text-[10px] leading-tight"
            title="Macro Manager (Ctrl+Shift+R)"
          >
            <span style={{ fontSize: 14 }}>⏺</span>
            <span>Macro</span>
          </button>
          <button
            onClick={onOpenTunnels}
            className="flex flex-col items-center justify-center py-1 text-text-secondary hover:text-white hover:bg-hover-bg rounded text-[10px] leading-tight"
            title="SSH Tunnels (Ctrl+Shift+T)"
          >
            <span style={{ fontSize: 14 }}>🔀</span>
            <span>Tunnel</span>
          </button>
          <button
            onClick={onToggleMultiExec}
            className="flex flex-col items-center justify-center py-1 text-text-secondary hover:text-white hover:bg-hover-bg rounded text-[10px] leading-tight"
            title="Multi-Execution (Ctrl+Shift+M)"
          >
            <span style={{ fontSize: 14 }}>📤</span>
            <span>Multi</span>
          </button>
        </div>
      </div>

      {/* Import/Export + Settings */}
      <div className="p-2 border-t border-border-color flex gap-1">
        <button
          className="flex-1 text-xs text-text-secondary hover:text-white hover:bg-hover-bg px-2 py-1 rounded border border-border-color"
          onClick={async () => {
            try {
              const count = await wailsCall('ImportSessions');
              if (count > 0) {
                loadSessions();
                loadFolders();
                alert(`Imported ${count} session(s).`);
              }
            } catch (e: any) {
              alert(`Import failed: ${e.message || e}`);
            }
          }}
          title="Import sessions from JSON file"
        >
          Import
        </button>
        <button
          className="flex-1 text-xs text-text-secondary hover:text-white hover:bg-hover-bg px-2 py-1 rounded border border-border-color"
          onClick={async () => {
            try {
              const path = await wailsCall('ExportSessions');
              if (path) {
                alert(`Exported to: ${path}`);
              }
            } catch (e: any) {
              alert(`Export failed: ${e.message || e}`);
            }
          }}
          title="Export sessions to JSON file"
        >
          Export
        </button>
        <button
          className="text-xs text-text-secondary hover:text-white hover:bg-hover-bg px-2 py-1 rounded border border-border-color"
          onClick={onOpenSettings}
          title="Settings (Ctrl+,)"
        >
          ⚙
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-tab-bg border border-border-color rounded shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'session' && contextMenu.id && (
            <>
              <button
                className="block w-full text-left px-4 py-1 text-xs hover:bg-accent hover:text-white"
                onClick={() => {
                  const s = sessions.find((s) => s.id === contextMenu.id);
                  if (s) handleConnect(s);
                  closeContextMenu();
                }}
              >
                Connect
              </button>
              <button
                className="block w-full text-left px-4 py-1 text-xs hover:bg-accent hover:text-white"
                onClick={() => {
                  const s = sessions.find((s) => s.id === contextMenu.id);
                  if (s) onEditSession(s);
                  closeContextMenu();
                }}
              >
                Edit
              </button>
              <button
                className="block w-full text-left px-4 py-1 text-xs hover:bg-red-600 hover:text-white"
                onClick={() => {
                  if (contextMenu.id && confirm('Delete this session?')) {
                    deleteSession(contextMenu.id);
                  }
                  closeContextMenu();
                }}
              >
                Delete
              </button>
            </>
          )}
          {contextMenu.type === 'folder' && contextMenu.id && (
            <>
              <button
                className="block w-full text-left px-4 py-1 text-xs hover:bg-accent hover:text-white"
                onClick={() => {
                  onEditSession();
                  closeContextMenu();
                }}
              >
                New Session in Folder
              </button>
              <button
                className="block w-full text-left px-4 py-1 text-xs hover:bg-red-600 hover:text-white"
                onClick={() => {
                  if (contextMenu.id && confirm('Delete this folder?')) {
                    deleteFolder(contextMenu.id);
                  }
                  closeContextMenu();
                }}
              >
                Delete Folder
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Sub-component for a session item
function SessionItem({
  session,
  onConnect,
  onEdit,
  onDelete,
  onContextMenu,
  protocolIcon,
}: {
  session: Session;
  onConnect: (s: Session) => void;
  onEdit: (s: Session) => void;
  onDelete: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, type: string, id: string) => void;
  protocolIcon: (p: string) => string;
}) {
  return (
    <div
      className="flex items-center px-2 py-1 text-xs cursor-pointer hover:bg-hover-bg rounded group"
      onDoubleClick={() => onConnect(session)}
      onContextMenu={(e) => onContextMenu(e, 'session', session.id)}
      title={session.protocol === 'serial'
        ? `Serial ${session.serialOptions?.portName || ''} @ ${session.serialOptions?.baudRate || 9600}`
        : `${session.protocol.toUpperCase()} ${session.username}@${session.host}:${session.port}`
      }
    >
      <span className="mr-1">{protocolIcon(session.protocol)}</span>
      <span className="text-text-primary truncate flex-1">{session.name}</span>
      <span className="text-text-secondary text-[10px] hidden group-hover:inline ml-1">
        {session.protocol === 'serial' ? session.serialOptions?.portName : session.host}
      </span>
    </div>
  );
}
