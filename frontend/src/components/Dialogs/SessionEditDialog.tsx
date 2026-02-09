import { useState, useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import type { Session } from '../../types';

interface SessionEditDialogProps {
  session?: Session;
  defaultFolderId?: string;
  onClose: () => void;
}

const defaultSession: Partial<Session> = {
  name: '',
  protocol: 'ssh',
  host: '',
  port: 22,
  username: '',
  authMethod: 'password',
  keyFilePath: '',
  folderId: '',
};

export default function SessionEditDialog({ session, defaultFolderId, onClose }: SessionEditDialogProps) {
  const createSession = useSessionStore((s) => s.createSession);
  const updateSession = useSessionStore((s) => s.updateSession);
  const savePassword = useSessionStore((s) => s.savePassword);
  const getPassword = useSessionStore((s) => s.getPassword);
  const folders = useSessionStore((s) => s.folders);

  const [form, setForm] = useState<Partial<Session>>(session || { ...defaultSession, folderId: defaultFolderId || '' });
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const isEdit = !!session;

  useEffect(() => {
    if (session) {
      getPassword(session.id).then(setPassword);
    }
  }, [session]);

  useEffect(() => {
    if (form.protocol === 'serial') {
      // Load available COM ports
      (async () => {
        try {
          // Use window.go directly - Wails bindings are on window object
          const ports = await (window as any)['go']['main']['App']['ListSerialPorts']();
          console.log('Serial ports found:', ports);
          setAvailablePorts(ports || []);
        } catch (err) {
          console.error('Failed to list serial ports:', err);
          setAvailablePorts([]);
        }
      })();
      // Set default serial options if not present
      if (!form.serialOptions) {
        setForm((f) => ({
          ...f,
          serialOptions: { portName: '', baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowCtrl: 'none' },
        }));
      }
    } else {
      const portDefaults: Record<string, number> = { ssh: 22, telnet: 23, rdp: 3389 };
      const defaultPort = portDefaults[form.protocol || 'ssh'];
      if (!session || form.protocol !== session.protocol) {
        setForm((f) => ({ ...f, port: defaultPort }));
      }
    }
  }, [form.protocol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await updateSession(form as Session);
        if (password) {
          await savePassword(session!.id, password);
        }
      } else {
        const created = await createSession(form);
        if (password) {
          await savePassword(created.id, password);
        }
      }
      onClose();
    } catch (e: any) {
      alert(`Failed to save session: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-sidebar-bg border border-border-color rounded-lg shadow-xl w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-color">
          <h2 className="text-sm font-semibold text-text-primary">
            {isEdit ? 'Edit Session' : 'New Session'}
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Name */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Name</label>
            <input
              type="text"
              required
              className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color focus:border-accent focus:outline-none"
              value={form.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="My Server"
            />
          </div>

          {/* Protocol */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Protocol</label>
            <select
              className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color focus:border-accent focus:outline-none"
              value={form.protocol || 'ssh'}
              onChange={(e) => updateField('protocol', e.target.value)}
            >
              <option value="ssh">SSH</option>
              <option value="telnet">Telnet</option>
              <option value="serial">Serial (COM)</option>
              <option value="rdp">RDP</option>
            </select>
          </div>

          {/* Host + Port (not for serial) */}
          {form.protocol !== 'serial' && (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1">Host</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color focus:border-accent focus:outline-none"
                    value={form.host || ''}
                    onChange={(e) => updateField('host', e.target.value)}
                    placeholder="192.168.1.1"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-text-secondary mb-1">Port</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color focus:border-accent focus:outline-none"
                    value={form.port || 22}
                    onChange={(e) => updateField('port', parseInt(e.target.value))}
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">Username</label>
                <input
                  type="text"
                  className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color focus:border-accent focus:outline-none"
                  value={form.username || ''}
                  onChange={(e) => updateField('username', e.target.value)}
                  placeholder="root"
                />
              </div>
            </>
          )}

          {/* Serial Options */}
          {form.protocol === 'serial' && (
            <div className="border border-border-color rounded p-3 space-y-2">
              <div className="text-xs text-text-secondary font-semibold mb-1">Serial Port Settings</div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">COM Port</label>
                <select
                  className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color focus:border-accent focus:outline-none"
                  value={form.serialOptions?.portName || ''}
                  onChange={(e) =>
                    updateField('serialOptions', { ...form.serialOptions, portName: e.target.value })
                  }
                >
                  <option value="">-- Select Port --</option>
                  {availablePorts.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {availablePorts.length === 0 && (
                  <div className="text-[10px] text-yellow-500 mt-1">No COM ports detected. Connect a device and reopen this dialog.</div>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1">Baud Rate</label>
                  <select
                    className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color"
                    value={form.serialOptions?.baudRate || 9600}
                    onChange={(e) =>
                      updateField('serialOptions', { ...form.serialOptions, baudRate: parseInt(e.target.value) })
                    }
                  >
                    {[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1">Data Bits</label>
                  <select
                    className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color"
                    value={form.serialOptions?.dataBits || 8}
                    onChange={(e) =>
                      updateField('serialOptions', { ...form.serialOptions, dataBits: parseInt(e.target.value) })
                    }
                  >
                    <option value={7}>7</option>
                    <option value={8}>8</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1">Stop Bits</label>
                  <select
                    className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color"
                    value={form.serialOptions?.stopBits || 1}
                    onChange={(e) =>
                      updateField('serialOptions', { ...form.serialOptions, stopBits: parseInt(e.target.value) })
                    }
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1">Parity</label>
                  <select
                    className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color"
                    value={form.serialOptions?.parity || 'none'}
                    onChange={(e) =>
                      updateField('serialOptions', { ...form.serialOptions, parity: e.target.value })
                    }
                  >
                    <option value="none">None</option>
                    <option value="odd">Odd</option>
                    <option value="even">Even</option>
                    <option value="mark">Mark</option>
                    <option value="space">Space</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Flow Control</label>
                <select
                  className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color"
                  value={form.serialOptions?.flowCtrl || 'none'}
                  onChange={(e) =>
                    updateField('serialOptions', { ...form.serialOptions, flowCtrl: e.target.value })
                  }
                >
                  <option value="none">None</option>
                  <option value="hardware">Hardware (RTS/CTS)</option>
                  <option value="software">Software (XON/XOFF)</option>
                </select>
              </div>
            </div>
          )}

          {/* Auth Method (SSH only) */}
          {form.protocol === 'ssh' && (
            <>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Authentication</label>
                <select
                  className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color focus:border-accent focus:outline-none"
                  value={form.authMethod || 'password'}
                  onChange={(e) => updateField('authMethod', e.target.value)}
                >
                  <option value="password">Password</option>
                  <option value="keyfile">Key File</option>
                </select>
              </div>

              {form.authMethod === 'keyfile' && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Key File Path</label>
                  <input
                    type="text"
                    className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color focus:border-accent focus:outline-none"
                    value={form.keyFilePath || ''}
                    onChange={(e) => updateField('keyFilePath', e.target.value)}
                    placeholder="C:\Users\user\.ssh\id_rsa"
                  />
                </div>
              )}
            </>
          )}

          {/* Password */}
          {form.protocol !== 'serial' ? (
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Password {form.authMethod === 'keyfile' ? '(passphrase)' : ''}
              </label>
              <input
                type="password"
                className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color focus:border-accent focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Stored in Windows Credential Manager"
              />
            </div>
          ) : null}

          {/* Folder */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Folder</label>
            <select
              className="w-full bg-app-bg text-text-primary text-xs px-2 py-1.5 rounded border border-border-color focus:border-accent focus:outline-none"
              value={form.folderId || ''}
              onChange={(e) => updateField('folderId', e.target.value)}
            >
              <option value="">(No folder)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* RDP Options */}
          {form.protocol === 'rdp' && (
            <div className="border border-border-color rounded p-3 space-y-2">
              <div className="text-xs text-text-secondary font-semibold mb-1">RDP Options</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1">Width</label>
                  <input
                    type="number"
                    className="w-full bg-app-bg text-text-primary text-xs px-2 py-1 rounded border border-border-color"
                    value={form.rdpOptions?.width || 1920}
                    onChange={(e) =>
                      updateField('rdpOptions', { ...form.rdpOptions, width: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-secondary mb-1">Height</label>
                  <input
                    type="number"
                    className="w-full bg-app-bg text-text-primary text-xs px-2 py-1 rounded border border-border-color"
                    value={form.rdpOptions?.height || 1080}
                    onChange={(e) =>
                      updateField('rdpOptions', { ...form.rdpOptions, height: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-text-primary">
                <input
                  type="checkbox"
                  checked={form.rdpOptions?.fullScreen || false}
                  onChange={(e) =>
                    updateField('rdpOptions', { ...form.rdpOptions, fullScreen: e.target.checked })
                  }
                />
                Full Screen
              </label>
              <label className="flex items-center gap-2 text-xs text-text-primary">
                <input
                  type="checkbox"
                  checked={form.rdpOptions?.clipboardRedirect !== false}
                  onChange={(e) =>
                    updateField('rdpOptions', { ...form.rdpOptions, clipboardRedirect: e.target.checked })
                  }
                />
                Clipboard Redirect
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs bg-tab-bg text-text-primary border border-border-color rounded hover:bg-hover-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
