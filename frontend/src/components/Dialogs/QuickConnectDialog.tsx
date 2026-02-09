import { useState, useEffect, useRef } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';

interface QuickConnectDialogProps {
  onClose: () => void;
}

interface RecentEntry {
  host: string;
  port: number;
  username: string;
  protocol: string;
  timestamp: number;
}

const RECENT_KEY = 'goconnect_recent_connections';
const MAX_RECENT = 10;

function getRecent(): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecent(entry: Omit<RecentEntry, 'timestamp'>) {
  const list = getRecent().filter(
    (r) => !(r.host === entry.host && r.port === entry.port && r.username === entry.username)
  );
  list.unshift({ ...entry, timestamp: Date.now() });
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

export default function QuickConnectDialog({ onClose }: QuickConnectDialogProps) {
  const connectSSH = useConnectionStore((s) => s.connectSSH);
  const quickConnectSSH = useConnectionStore((s) => s.quickConnectSSH);
  const connectTelnet = useConnectionStore((s) => s.connectTelnet);

  const [protocol, setProtocol] = useState('ssh');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<RecentEntry[]>(getRecent());
  const [showRecent, setShowRecent] = useState(false);

  const hostRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hostRef.current?.focus();
  }, []);

  const handleProtocolChange = (p: string) => {
    setProtocol(p);
    if (p === 'ssh') setPort(22);
    else if (p === 'telnet') setPort(23);
    else if (p === 'rdp') setPort(3389);
  };

  const handleConnect = async () => {
    if (!host.trim()) { setError('Host is required'); return; }
    setConnecting(true);
    setError('');
    try {
      if (protocol === 'ssh') {
        await quickConnectSSH(host, port, username, password, 80, 24);
      } else if (protocol === 'telnet') {
        // Use Wails call directly for telnet quick connect
        const wailsCall = (window as any)['go']['main']['App'];
        const connId = await wailsCall['ConnectTelnet']('', 80, 24);
      }
      addRecent({ host, port, username, protocol });
      onClose();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setConnecting(false);
    }
  };

  const handleRecentSelect = (entry: RecentEntry) => {
    setProtocol(entry.protocol);
    setHost(entry.host);
    setPort(entry.port);
    setUsername(entry.username);
    setShowRecent(false);
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
        width: 420, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ color: '#fff', fontSize: 16, margin: 0 }}>Quick Connect</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* Protocol selector */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {['ssh', 'telnet', 'rdp'].map((p) => (
            <button
              key={p}
              onClick={() => handleProtocolChange(p)}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                background: protocol === p ? '#094771' : '#333', color: protocol === p ? '#fff' : '#aaa',
                fontSize: 12, fontWeight: protocol === p ? 600 : 400,
              }}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Host + Port */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <label style={{ color: '#aaa', fontSize: 11, display: 'block', marginBottom: 2 }}>Host</label>
            <input
              ref={hostRef}
              value={host}
              onChange={(e) => setHost(e.target.value)}
              onFocus={() => recent.length > 0 && setShowRecent(true)}
              onBlur={() => setTimeout(() => setShowRecent(false), 150)}
              placeholder="hostname or IP"
              style={{
                width: '100%', background: '#2d2d2d', color: '#ccc', border: '1px solid #555',
                borderRadius: 4, padding: '6px 8px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
            />
            {/* Recent dropdown */}
            {showRecent && recent.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: '#252526', border: '1px solid #3c3c3c', borderRadius: 4,
                maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}>
                <div style={{ padding: '4px 8px', color: '#888', fontSize: 10, borderBottom: '1px solid #333' }}>
                  Recent Connections
                </div>
                {recent.map((r, i) => (
                  <button
                    key={i}
                    onMouseDown={() => handleRecentSelect(r)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', background: 'none',
                      border: 'none', color: '#ccc', padding: '6px 8px', cursor: 'pointer', fontSize: 12,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#094771')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ color: '#569cd6' }}>{r.protocol.toUpperCase()}</span>{' '}
                    {r.username ? `${r.username}@` : ''}{r.host}:{r.port}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ width: 80 }}>
            <label style={{ color: '#aaa', fontSize: 11, display: 'block', marginBottom: 2 }}>Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value) || 0)}
              style={{
                width: '100%', background: '#2d2d2d', color: '#ccc', border: '1px solid #555',
                borderRadius: 4, padding: '6px 8px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
            />
          </div>
        </div>

        {/* Username + Password (only for SSH/RDP) */}
        {protocol !== 'telnet' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#aaa', fontSize: 11, display: 'block', marginBottom: 2 }}>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                style={{
                  width: '100%', background: '#2d2d2d', color: '#ccc', border: '1px solid #555',
                  borderRadius: 4, padding: '6px 8px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#aaa', fontSize: 11, display: 'block', marginBottom: 2 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                style={{
                  width: '100%', background: '#2d2d2d', color: '#ccc', border: '1px solid #555',
                  borderRadius: 4, padding: '6px 8px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: '#f44', fontSize: 12, marginBottom: 8 }}>{error}</div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button
            onClick={onClose}
            style={{
              background: '#333', color: '#ccc', border: 'none', borderRadius: 4,
              padding: '6px 16px', cursor: 'pointer', fontSize: 12,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              background: '#094771', color: '#fff', border: 'none', borderRadius: 4,
              padding: '6px 16px', cursor: 'pointer', fontSize: 12, opacity: connecting ? 0.6 : 1,
            }}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
