import { useState, useEffect } from 'react';

const wailsCall = (method: string, ...args: any[]) => {
  return (window as any)['go']['main']['App'][method](...args);
};

interface SFTPFileInfo {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  modTime: number;
  mode: string;
}

interface SFTPPanelProps {
  sessionId: string;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function SFTPPanel({ sessionId, onClose }: SFTPPanelProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<SFTPFileInfo[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    setError('');
    try {
      await wailsCall('OpenSFTP', sessionId);
      setConnected(true);
      const home = await wailsCall('SFTPGetHome', sessionId);
      setCurrentPath(home || '/');
      await loadDir(home || '/');
    } catch (e: any) {
      setError(e.message || String(e));
    }
    setConnecting(false);
  };

  const loadDir = async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const list = await wailsCall('SFTPListDir', sessionId, path);
      setFiles(list || []);
      setCurrentPath(path);
      setSelectedFile(null);
    } catch (e: any) {
      setError(e.message || String(e));
    }
    setLoading(false);
  };

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parent = '/' + parts.join('/');
    loadDir(parent);
  };

  const handleDoubleClick = (file: SFTPFileInfo) => {
    if (file.isDir) {
      loadDir(file.path);
    }
  };

  const handleDownload = async () => {
    if (!selectedFile) return;
    const file = files.find((f) => f.path === selectedFile);
    if (!file || file.isDir) return;
    try {
      const localPath = await wailsCall('SFTPDownload', sessionId, file.path, file.name);
      if (localPath) {
        alert(`Downloaded to: ${localPath}`);
      }
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const handleUpload = async () => {
    try {
      const name = await wailsCall('SFTPUpload', sessionId, currentPath);
      if (name) {
        await loadDir(currentPath);
      }
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    const file = files.find((f) => f.path === selectedFile);
    if (!file) return;
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
      await wailsCall('SFTPDelete', sessionId, file.path);
      await loadDir(currentPath);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const handleRename = async () => {
    if (!selectedFile) return;
    const file = files.find((f) => f.path === selectedFile);
    if (!file) return;
    const newName = prompt('New name:', file.name);
    if (!newName || newName === file.name) return;
    const dir = currentPath.endsWith('/') ? currentPath : currentPath + '/';
    try {
      await wailsCall('SFTPRename', sessionId, file.path, dir + newName);
      await loadDir(currentPath);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const handleMkDir = async () => {
    const name = prompt('New directory name:');
    if (!name) return;
    const dir = currentPath.endsWith('/') ? currentPath : currentPath + '/';
    try {
      await wailsCall('SFTPMkDir', sessionId, dir + name);
      await loadDir(currentPath);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  useEffect(() => {
    connect();
    return () => {
      wailsCall('CloseSFTP', sessionId).catch(() => {});
    };
  }, [sessionId]);

  if (!connected) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}>
        <div style={{ background: '#1e1e1e', padding: 24, borderRadius: 8, border: '1px solid #3c3c3c', textAlign: 'center' }}>
          {connecting ? (
            <div style={{ color: '#ccc', fontSize: 13 }}>Connecting SFTP...</div>
          ) : error ? (
            <div>
              <div style={{ color: '#f44', fontSize: 13, marginBottom: 12 }}>{error}</div>
              <button onClick={connect} style={{ background: '#094771', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer', fontSize: 12 }}>
                Retry
              </button>
              <button onClick={onClose} style={{ background: '#333', color: '#ccc', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer', fontSize: 12, marginLeft: 8 }}>
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

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
        width: 640, height: 500, display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: 14, margin: 0 }}>SFTP File Browser</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* Path bar + actions */}
        <div style={{ padding: '6px 16px', borderBottom: '1px solid #333', display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={navigateUp} style={{ background: '#333', color: '#ccc', border: 'none', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>
            ..
          </button>
          <input
            value={currentPath}
            onChange={(e) => setCurrentPath(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadDir(currentPath); }}
            style={{
              flex: 1, background: '#2d2d2d', color: '#ccc', border: '1px solid #555',
              borderRadius: 3, padding: '3px 8px', fontSize: 12, outline: 'none',
            }}
          />
          <button onClick={() => loadDir(currentPath)} style={{ background: '#333', color: '#ccc', border: 'none', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>
            Go
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '4px 16px', borderBottom: '1px solid #333', display: 'flex', gap: 4 }}>
          <button onClick={handleUpload} style={{ background: '#094771', color: '#fff', border: 'none', borderRadius: 3, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}>
            Upload
          </button>
          <button onClick={handleDownload} disabled={!selectedFile} style={{ background: '#333', color: selectedFile ? '#ccc' : '#666', border: 'none', borderRadius: 3, padding: '3px 10px', cursor: selectedFile ? 'pointer' : 'not-allowed', fontSize: 11 }}>
            Download
          </button>
          <button onClick={handleMkDir} style={{ background: '#333', color: '#ccc', border: 'none', borderRadius: 3, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}>
            New Dir
          </button>
          <button onClick={handleRename} disabled={!selectedFile} style={{ background: '#333', color: selectedFile ? '#ccc' : '#666', border: 'none', borderRadius: 3, padding: '3px 10px', cursor: selectedFile ? 'pointer' : 'not-allowed', fontSize: 11 }}>
            Rename
          </button>
          <button onClick={handleDelete} disabled={!selectedFile} style={{ background: '#333', color: selectedFile ? '#f44' : '#666', border: 'none', borderRadius: 3, padding: '3px 10px', cursor: selectedFile ? 'pointer' : 'not-allowed', fontSize: 11 }}>
            Delete
          </button>
        </div>

        {error && <div style={{ padding: '4px 16px', color: '#f44', fontSize: 11 }}>{error}</div>}

        {/* File list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Header row */}
          <div style={{ display: 'flex', padding: '4px 16px', borderBottom: '1px solid #333', color: '#888', fontSize: 10, fontWeight: 600 }}>
            <span style={{ flex: 3 }}>Name</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Size</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Mode</span>
          </div>

          {loading ? (
            <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: 20 }}>Loading...</div>
          ) : files.length === 0 ? (
            <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: 20 }}>Empty directory</div>
          ) : (
            files.map((file) => (
              <div
                key={file.path}
                onClick={() => setSelectedFile(file.path)}
                onDoubleClick={() => handleDoubleClick(file)}
                style={{
                  display: 'flex', padding: '3px 16px', cursor: 'pointer',
                  background: selectedFile === file.path ? '#094771' : 'transparent',
                  color: '#ccc', fontSize: 12,
                }}
                onMouseEnter={(e) => {
                  if (selectedFile !== file.path) e.currentTarget.style.background = '#2a2a2a';
                }}
                onMouseLeave={(e) => {
                  if (selectedFile !== file.path) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ flex: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 14 }}>{file.isDir ? '\uD83D\uDCC1' : '\uD83D\uDCC4'}</span>
                  {file.name}
                </span>
                <span style={{ flex: 1, textAlign: 'right', color: '#888' }}>
                  {file.isDir ? '-' : formatSize(file.size)}
                </span>
                <span style={{ flex: 1, textAlign: 'right', color: '#666', fontFamily: 'monospace', fontSize: 10 }}>
                  {file.mode}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
