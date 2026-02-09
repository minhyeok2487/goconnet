import { useState, useEffect } from 'react';
import { useSettingsStore, THEMES, type AppSettings } from '../../stores/settingsStore';

interface SettingsDialogProps {
  onClose: () => void;
}

export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [form, setForm] = useState<AppSettings>({ ...settings });

  const handleSave = async () => {
    await updateSettings(form);
    onClose();
  };

  const themePreview = THEMES[form.theme] || THEMES.dark;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: 8,
        padding: 24, width: 480, maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        <h2 style={{ color: '#ccc', margin: '0 0 20px', fontSize: 18 }}>Settings</h2>

        {/* Theme */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#999', fontSize: 12, display: 'block', marginBottom: 4 }}>Theme</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {Object.entries(THEMES).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setForm({ ...form, theme: key })}
                style={{
                  background: theme.background,
                  color: theme.foreground,
                  border: form.theme === key ? '2px solid #007acc' : '1px solid #555',
                  borderRadius: 6,
                  padding: '8px 6px',
                  cursor: 'pointer',
                  fontSize: 11,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 'bold' }}>{theme.name}</div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 4 }}>
                  {[theme.red, theme.green, theme.yellow, theme.blue, theme.magenta, theme.cyan].map((c, i) => (
                    <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#999', fontSize: 12, display: 'block', marginBottom: 4 }}>
            Font Size: {form.fontSize}px
          </label>
          <input
            type="range"
            min={10}
            max={24}
            value={form.fontSize}
            onChange={(e) => setForm({ ...form, fontSize: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: '#007acc' }}
          />
        </div>

        {/* Font Family */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#999', fontSize: 12, display: 'block', marginBottom: 4 }}>Font Family</label>
          <select
            value={form.fontFamily}
            onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}
            style={{ width: '100%', background: '#3c3c3c', color: '#ccc', border: '1px solid #555', borderRadius: 3, padding: '6px 8px', fontSize: 13 }}
          >
            <option value="'Cascadia Code', 'Consolas', 'Courier New', monospace">Cascadia Code</option>
            <option value="'Consolas', 'Courier New', monospace">Consolas</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="'Fira Code', monospace">Fira Code</option>
            <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
            <option value="'Source Code Pro', monospace">Source Code Pro</option>
            <option value="monospace">System Monospace</option>
          </select>
        </div>

        {/* Cursor Style */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#999', fontSize: 12, display: 'block', marginBottom: 4 }}>Cursor Style</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['block', 'underline', 'bar'].map((style) => (
              <button
                key={style}
                onClick={() => setForm({ ...form, cursorStyle: style })}
                style={{
                  background: form.cursorStyle === style ? '#094771' : '#3c3c3c',
                  color: '#ccc', border: '1px solid #555', borderRadius: 4,
                  padding: '6px 16px', cursor: 'pointer', fontSize: 12,
                  textTransform: 'capitalize',
                }}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Cursor Blink */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#ccc', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.cursorBlink}
              onChange={(e) => setForm({ ...form, cursorBlink: e.target.checked })}
              style={{ accentColor: '#007acc' }}
            />
            Cursor Blink
          </label>
        </div>

        {/* Scrollback Lines */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: '#999', fontSize: 12, display: 'block', marginBottom: 4 }}>
            Scrollback Lines: {form.scrollbackLines.toLocaleString()}
          </label>
          <input
            type="range"
            min={1000}
            max={100000}
            step={1000}
            value={form.scrollbackLines}
            onChange={(e) => setForm({ ...form, scrollbackLines: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: '#007acc' }}
          />
        </div>

        {/* Preview */}
        <div style={{
          background: themePreview.background,
          color: themePreview.foreground,
          padding: 12,
          borderRadius: 4,
          fontFamily: form.fontFamily,
          fontSize: form.fontSize,
          marginBottom: 20,
          border: '1px solid #555',
        }}>
          <div>user@server:~$ ls -la</div>
          <div><span style={{ color: themePreview.blue }}>drwxr-xr-x</span> <span style={{ color: themePreview.green }}>user</span> <span style={{ color: themePreview.yellow }}>4096</span> Documents/</div>
          <div><span style={{ color: themePreview.red }}>-rw-r--r--</span> <span style={{ color: themePreview.green }}>user</span> <span style={{ color: themePreview.yellow }}>1234</span> <span style={{ color: themePreview.cyan }}>config.json</span></div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ background: '#3c3c3c', color: '#ccc', border: 'none', borderRadius: 4, padding: '8px 20px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ background: '#007acc', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 20px', cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
