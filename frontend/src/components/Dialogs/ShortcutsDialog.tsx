interface ShortcutsDialogProps {
  onClose: () => void;
}

const shortcuts = [
  { category: 'General', items: [
    { keys: 'Ctrl+T', desc: 'New session' },
    { keys: 'Ctrl+W', desc: 'Close current tab' },
    { keys: 'Ctrl+Tab', desc: 'Next tab' },
    { keys: 'Ctrl+Shift+Tab', desc: 'Previous tab' },
    { keys: 'Ctrl+,', desc: 'Settings' },
    { keys: 'F1', desc: 'Keyboard shortcuts' },
    { keys: 'F11', desc: 'Toggle fullscreen' },
  ]},
  { category: 'Terminal', items: [
    { keys: 'Ctrl+Shift+F', desc: 'Find in terminal' },
    { keys: 'Ctrl+Shift+S', desc: 'Save terminal output' },
    { keys: 'Ctrl+Shift+U', desc: 'Duplicate current tab' },
  ]},
  { category: 'Layout', items: [
    { keys: 'Ctrl+Shift+B', desc: 'Toggle sidebar' },
    { keys: 'Ctrl+Shift+1', desc: 'Single terminal' },
    { keys: 'Ctrl+Shift+2', desc: 'Vertical split (2 panes)' },
    { keys: 'Ctrl+Shift+3', desc: 'Horizontal split (2 panes)' },
    { keys: 'Ctrl+Shift+4', desc: 'Quad split (4 panes)' },
  ]},
  { category: 'Features', items: [
    { keys: 'Ctrl+Shift+Q', desc: 'Quick Connect' },
    { keys: 'Ctrl+Shift+M', desc: 'Multi-Execution panel' },
    { keys: 'Ctrl+Shift+R', desc: 'Macro manager' },
    { keys: 'Ctrl+Shift+T', desc: 'SSH Tunnel manager' },
    { keys: 'Ctrl+Shift+P', desc: 'SFTP File Browser (SSH only)' },
  ]},
];

export default function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: 8,
        width: 500, maxHeight: '80vh', overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ color: '#fff', fontSize: 16, margin: 0 }}>Keyboard Shortcuts</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {shortcuts.map((section) => (
          <div key={section.category} style={{ marginBottom: 16 }}>
            <div style={{ color: '#569cd6', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
              {section.category}
            </div>
            {section.items.map((item) => (
              <div
                key={item.keys}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 0', borderBottom: '1px solid #2a2a2a',
                }}
              >
                <span style={{ color: '#ccc', fontSize: 12 }}>{item.desc}</span>
                <kbd style={{
                  background: '#333', color: '#ddd', padding: '2px 8px', borderRadius: 3,
                  fontSize: 11, border: '1px solid #555', fontFamily: 'monospace',
                }}>
                  {item.keys}
                </kbd>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
