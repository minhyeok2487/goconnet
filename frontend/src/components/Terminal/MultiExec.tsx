import { useState } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';

interface MultiExecProps {
  visible: boolean;
  onClose: () => void;
}

export default function MultiExec({ visible, onClose }: MultiExecProps) {
  const tabs = useConnectionStore((s) => s.tabs);
  const sendInput = useConnectionStore((s) => s.sendInput);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [command, setCommand] = useState('');

  if (!visible) return null;

  const connectedTabs = tabs.filter((t) => t.isConnected);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(connectedTabs.map((t) => t.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const executeCommand = () => {
    if (!command || selectedIds.size === 0) return;
    const data = command + '\r';
    selectedIds.forEach((id) => {
      sendInput(id, data);
    });
    setCommand('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: '#252526',
        border: '1px solid #3c3c3c',
        borderRadius: 6,
        padding: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        minWidth: 400,
        maxWidth: 600,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: '#ccc', fontSize: 13, fontWeight: 'bold' }}>
          Multi-Execution ({selectedIds.size}/{connectedTabs.length} selected)
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={selectAll} style={{ background: 'none', border: 'none', color: '#4fc1ff', cursor: 'pointer', fontSize: 12 }}>
            Select All
          </button>
          <button onClick={selectNone} style={{ background: 'none', border: 'none', color: '#4fc1ff', cursor: 'pointer', fontSize: 12 }}>
            None
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14 }}>
            &#10005;
          </button>
        </div>
      </div>

      {/* Target selection */}
      <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 8 }}>
        {connectedTabs.map((tab) => (
          <label
            key={tab.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 4px',
              cursor: 'pointer',
              borderRadius: 3,
              background: selectedIds.has(tab.id) ? '#094771' : 'transparent',
              color: '#ccc',
              fontSize: 12,
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(tab.id)}
              onChange={() => toggleSelection(tab.id)}
              style={{ accentColor: '#007acc' }}
            />
            {tab.label}
          </label>
        ))}
        {connectedTabs.length === 0 && (
          <div style={{ color: '#888', fontSize: 12, padding: 4 }}>No active connections</div>
        )}
      </div>

      {/* Command input */}
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              executeCommand();
            }
          }}
          placeholder="Enter command to send to all selected..."
          style={{
            flex: 1,
            background: '#3c3c3c',
            color: '#cccccc',
            border: '1px solid #555',
            borderRadius: 3,
            padding: '6px 10px',
            fontSize: 13,
            outline: 'none',
            fontFamily: "'Cascadia Code', 'Consolas', monospace",
          }}
        />
        <button
          onClick={executeCommand}
          disabled={!command || selectedIds.size === 0}
          style={{
            background: selectedIds.size > 0 && command ? '#007acc' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: 3,
            padding: '6px 16px',
            cursor: selectedIds.size > 0 && command ? 'pointer' : 'default',
            fontSize: 13,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
