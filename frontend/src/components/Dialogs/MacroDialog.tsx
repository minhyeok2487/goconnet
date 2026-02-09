import { useState, useEffect } from 'react';
import { useMacroStore, type Macro, type MacroStep } from '../../stores/macroStore';
import { useConnectionStore } from '../../stores/connectionStore';

interface MacroDialogProps {
  onClose: () => void;
}

export default function MacroDialog({ onClose }: MacroDialogProps) {
  const macros = useMacroStore((s) => s.macros);
  const recording = useMacroStore((s) => s.recording);
  const recordedSteps = useMacroStore((s) => s.recordedSteps);
  const loadMacros = useMacroStore((s) => s.loadMacros);
  const createMacro = useMacroStore((s) => s.createMacro);
  const deleteMacro = useMacroStore((s) => s.deleteMacro);
  const startRecording = useMacroStore((s) => s.startRecording);
  const stopRecording = useMacroStore((s) => s.stopRecording);

  const tabs = useConnectionStore((s) => s.tabs);
  const activeTabId = useConnectionStore((s) => s.activeTabId);
  const sendInput = useConnectionStore((s) => s.sendInput);

  const [newName, setNewName] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    loadMacros();
  }, []);

  const handleStopAndSave = async () => {
    const steps = stopRecording();
    if (steps.length === 0) return;
    const name = prompt('Macro name:');
    if (!name) return;
    await createMacro(name, steps);
  };

  const handlePlay = async (macro: Macro, connId: string) => {
    setPlaying(macro.id);
    try {
      for (const step of macro.steps) {
        if (step.delay && step.delay > 0) {
          await new Promise((r) => setTimeout(r, Math.min(step.delay, 2000)));
        }
        await sendInput(connId, step.data);
      }
    } catch (e) {
      console.error('Macro playback error:', e);
    }
    setPlaying(null);
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

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
        width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: 16, margin: 0 }}>Macros</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* Recording controls */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #333', display: 'flex', gap: 8, alignItems: 'center' }}>
          {recording ? (
            <>
              <span style={{ color: '#f44', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f44', display: 'inline-block', animation: 'blink 1s infinite' }} />
                Recording... ({recordedSteps.length} steps)
              </span>
              <button
                onClick={handleStopAndSave}
                style={{
                  marginLeft: 'auto', background: '#094771', color: '#fff', border: 'none',
                  borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12,
                }}
              >
                Stop & Save
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startRecording}
                disabled={!activeTab?.isConnected}
                style={{
                  background: '#c33', color: '#fff', border: 'none', borderRadius: 4,
                  padding: '4px 12px', cursor: activeTab?.isConnected ? 'pointer' : 'not-allowed',
                  fontSize: 12, opacity: activeTab?.isConnected ? 1 : 0.5,
                }}
              >
                Start Recording
              </button>
              <span style={{ color: '#888', fontSize: 11 }}>
                {activeTab?.isConnected
                  ? `Recording on: ${activeTab.label}`
                  : 'Connect to a session first'}
              </span>
            </>
          )}
        </div>

        {/* Macro list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {macros.length === 0 ? (
            <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: 20 }}>
              No macros saved. Start recording to create one.
            </div>
          ) : (
            macros.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', padding: '8px 20px',
                  borderBottom: '1px solid #2a2a2a',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#ccc', fontSize: 13 }}>{m.name}</div>
                  <div style={{ color: '#888', fontSize: 11 }}>{m.steps.length} steps</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => activeTabId && handlePlay(m, activeTabId)}
                    disabled={!activeTab?.isConnected || playing === m.id}
                    style={{
                      background: '#094771', color: '#fff', border: 'none', borderRadius: 3,
                      padding: '3px 10px', cursor: activeTab?.isConnected ? 'pointer' : 'not-allowed',
                      fontSize: 11, opacity: activeTab?.isConnected ? 1 : 0.5,
                    }}
                  >
                    {playing === m.id ? 'Playing...' : 'Play'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete macro "${m.name}"?`)) {
                        deleteMacro(m.id);
                      }
                    }}
                    style={{
                      background: '#333', color: '#ccc', border: 'none', borderRadius: 3,
                      padding: '3px 10px', cursor: 'pointer', fontSize: 11,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
