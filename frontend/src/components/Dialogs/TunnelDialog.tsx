import { useState, useEffect } from 'react';

const wailsCall = (method: string, ...args: any[]) => {
  return (window as any)['go']['main']['App'][method](...args);
};

interface TunnelInfo {
  id: string;
  type: string;
  localAddr: string;
  remoteAddr: string;
  sshHost: string;
  sshPort: number;
  sshUser: string;
  active: boolean;
}

interface TunnelDialogProps {
  onClose: () => void;
}

export default function TunnelDialog({ onClose }: TunnelDialogProps) {
  const [tunnels, setTunnels] = useState<TunnelInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [localHost, setLocalHost] = useState('127.0.0.1');
  const [localPort, setLocalPort] = useState(8080);
  const [remoteHost, setRemoteHost] = useState('127.0.0.1');
  const [remotePort, setRemotePort] = useState(80);
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [sshUser, setSshUser] = useState('');
  const [sshPass, setSshPass] = useState('');

  const loadTunnels = async () => {
    try {
      const list = await wailsCall('GetTunnels');
      setTunnels(list || []);
    } catch (e) {
      console.error('Failed to load tunnels:', e);
    }
  };

  useEffect(() => { loadTunnels(); }, []);

  const handleCreate = async () => {
    if (!sshHost || !sshUser) {
      setError('SSH host and user are required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await wailsCall('CreateTunnel', {
        type: 'local',
        localHost,
        localPort,
        remoteHost,
        remotePort,
        sshHost,
        sshPort,
        sshUser,
        sshPass,
        keyFile: '',
      });
      await loadTunnels();
    } catch (e: any) {
      setError(e.message || String(e));
    }
    setCreating(false);
  };

  const handleClose = async (id: string) => {
    try {
      await wailsCall('CloseTunnel', id);
      await loadTunnels();
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const inputStyle = {
    width: '100%', background: '#2d2d2d', color: '#ccc', border: '1px solid #555',
    borderRadius: 4, padding: '5px 8px', fontSize: 12, outline: 'none', boxSizing: 'border-box' as const,
  };

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
        width: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: 16, margin: 0 }}>SSH Tunnel Manager</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* New tunnel form */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #333' }}>
          <div style={{ color: '#aaa', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
            New Local Port Forward
          </div>

          {/* SSH connection */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <div style={{ flex: 2 }}>
              <label style={{ color: '#888', fontSize: 10, display: 'block', marginBottom: 2 }}>SSH Host</label>
              <input value={sshHost} onChange={(e) => setSshHost(e.target.value)} placeholder="ssh-server" style={inputStyle} />
            </div>
            <div style={{ width: 60 }}>
              <label style={{ color: '#888', fontSize: 10, display: 'block', marginBottom: 2 }}>Port</label>
              <input type="number" value={sshPort} onChange={(e) => setSshPort(parseInt(e.target.value) || 22)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#888', fontSize: 10, display: 'block', marginBottom: 2 }}>User</label>
              <input value={sshUser} onChange={(e) => setSshUser(e.target.value)} placeholder="user" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#888', fontSize: 10, display: 'block', marginBottom: 2 }}>Password</label>
              <input type="password" value={sshPass} onChange={(e) => setSshPass(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Local -> Remote mapping */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#888', fontSize: 10, display: 'block', marginBottom: 2 }}>Local Host</label>
              <input value={localHost} onChange={(e) => setLocalHost(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ width: 70 }}>
              <label style={{ color: '#888', fontSize: 10, display: 'block', marginBottom: 2 }}>Local Port</label>
              <input type="number" value={localPort} onChange={(e) => setLocalPort(parseInt(e.target.value) || 0)} style={inputStyle} />
            </div>
            <span style={{ color: '#888', fontSize: 14, paddingBottom: 4 }}>&rarr;</span>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#888', fontSize: 10, display: 'block', marginBottom: 2 }}>Remote Host</label>
              <input value={remoteHost} onChange={(e) => setRemoteHost(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ width: 70 }}>
              <label style={{ color: '#888', fontSize: 10, display: 'block', marginBottom: 2 }}>Remote Port</label>
              <input type="number" value={remotePort} onChange={(e) => setRemotePort(parseInt(e.target.value) || 0)} style={inputStyle} />
            </div>
          </div>

          {error && <div style={{ color: '#f44', fontSize: 11, marginBottom: 6 }}>{error}</div>}

          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              background: '#094771', color: '#fff', border: 'none', borderRadius: 4,
              padding: '5px 16px', cursor: creating ? 'wait' : 'pointer', fontSize: 12,
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? 'Creating...' : 'Create Tunnel'}
          </button>
        </div>

        {/* Active tunnels */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '4px 20px', color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
            Active Tunnels ({tunnels.length})
          </div>
          {tunnels.length === 0 ? (
            <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 16 }}>
              No active tunnels
            </div>
          ) : (
            tunnels.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', padding: '8px 20px',
                  borderBottom: '1px solid #2a2a2a',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#ccc', fontSize: 12 }}>
                    <span style={{ color: '#4ec9b0' }}>{t.localAddr}</span>
                    {' '}&rarr;{' '}
                    <span style={{ color: '#569cd6' }}>{t.remoteAddr}</span>
                  </div>
                  <div style={{ color: '#888', fontSize: 10 }}>
                    via {t.sshUser}@{t.sshHost}:{t.sshPort}
                  </div>
                </div>
                <button
                  onClick={() => handleClose(t.id)}
                  style={{
                    background: '#333', color: '#f44', border: 'none', borderRadius: 3,
                    padding: '3px 10px', cursor: 'pointer', fontSize: 11,
                  }}
                >
                  Close
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
