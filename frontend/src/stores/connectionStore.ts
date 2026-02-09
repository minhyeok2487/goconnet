import { create } from 'zustand';
import type { Tab, ConnInfo } from '../types';

// Call Wails Go bindings via window.go (injected by Wails runtime)
const wailsCall = (method: string, ...args: any[]) => {
  return (window as any)['go']['main']['App'][method](...args);
};

interface ConnectionState {
  tabs: Tab[];
  activeTabId: string | null;
  statusText: string;

  connectSSH: (sessionId: string, name: string, cols: number, rows: number) => Promise<string>;
  connectTelnet: (sessionId: string, name: string, cols: number, rows: number) => Promise<string>;
  connectSerial: (sessionId: string, name: string) => Promise<string>;
  connectRDP: (sessionId: string) => Promise<void>;
  quickConnectSSH: (host: string, port: number, username: string, password: string, cols: number, rows: number) => Promise<string>;
  disconnect: (connId: string) => void;
  markDisconnected: (connId: string) => void;
  setActiveTab: (connId: string) => void;
  closeTab: (connId: string) => void;
  removeTab: (connId: string) => void;
  sendInput: (connId: string, data: string) => Promise<void>;
  resizeTerminal: (connId: string, cols: number, rows: number) => Promise<void>;
  setStatusText: (text: string) => void;
  duplicateTab: (connId: string) => Promise<void>;
  renameTab: (connId: string, label: string) => void;
  reconnectTab: (connId: string) => Promise<string | null>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  statusText: 'Ready',

  connectSSH: async (sessionId, name, cols, rows) => {
    const connId = await wailsCall('ConnectSSH', sessionId, cols, rows);
    const tab: Tab = {
      id: connId,
      sessionId,
      label: `SSH: ${name}`,
      protocol: 'ssh',
      isConnected: true,
      connectedAt: Date.now(),
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: connId,
      statusText: `Connected: SSH ${name}`,
    }));
    return connId;
  },

  connectTelnet: async (sessionId, name, cols, rows) => {
    const connId = await wailsCall('ConnectTelnet', sessionId, cols, rows);
    const tab: Tab = {
      id: connId,
      sessionId,
      label: `Telnet: ${name}`,
      protocol: 'telnet',
      isConnected: true,
      connectedAt: Date.now(),
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: connId,
      statusText: `Connected: Telnet ${name}`,
    }));
    return connId;
  },

  connectSerial: async (sessionId, name) => {
    const connId = await wailsCall('ConnectSerial', sessionId);
    const tab: Tab = {
      id: connId,
      sessionId,
      label: `Serial: ${name}`,
      protocol: 'serial',
      isConnected: true,
      connectedAt: Date.now(),
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: connId,
      statusText: `Connected: Serial ${name}`,
    }));
    return connId;
  },

  connectRDP: async (sessionId) => {
    await wailsCall('ConnectRDP', sessionId);
    set({ statusText: 'RDP session launched in mstsc.exe' });
  },

  quickConnectSSH: async (host, port, username, password, cols, rows) => {
    const connId = await wailsCall('QuickConnectSSH', host, port, username, password, cols, rows);
    const tab: Tab = {
      id: connId,
      label: `SSH: ${username}@${host}`,
      protocol: 'ssh',
      isConnected: true,
      connectedAt: Date.now(),
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: connId,
      statusText: `Connected: SSH ${username}@${host}`,
    }));
    return connId;
  },

  disconnect: (connId) => {
    wailsCall('Disconnect', connId);
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === connId ? { ...t, isConnected: false, label: t.label.replace(' (closed)', '') + ' (closed)' } : t
      ),
      statusText: 'Disconnected',
    }));
  },

  markDisconnected: (connId) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === connId ? { ...t, isConnected: false } : t
      ),
    }));
  },

  setActiveTab: (connId) => {
    set({ activeTabId: connId });
  },

  closeTab: (connId) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === connId);
    if (tab?.isConnected) {
      wailsCall('Disconnect', connId);
    }
    const remaining = state.tabs.filter((t) => t.id !== connId);
    const newActive = state.activeTabId === connId
      ? remaining.length > 0 ? remaining[remaining.length - 1].id : null
      : state.activeTabId;
    set({
      tabs: remaining,
      activeTabId: newActive,
      statusText: remaining.length === 0 ? 'Ready' : state.statusText,
    });
  },

  removeTab: (connId) => {
    set((state) => {
      const remaining = state.tabs.filter((t) => t.id !== connId);
      const newActive = state.activeTabId === connId
        ? remaining.length > 0 ? remaining[remaining.length - 1].id : null
        : state.activeTabId;
      return { tabs: remaining, activeTabId: newActive };
    });
  },

  sendInput: async (connId, data) => {
    await wailsCall('SendInput', connId, data);
  },

  resizeTerminal: async (connId, cols, rows) => {
    await wailsCall('ResizeTerminal', connId, cols, rows);
  },

  setStatusText: (text) => set({ statusText: text }),

  duplicateTab: async (connId) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === connId);
    if (!tab || !tab.sessionId) return;
    try {
      if (tab.protocol === 'ssh') {
        await state.connectSSH(tab.sessionId, tab.label.replace('SSH: ', ''), 80, 24);
      } else if (tab.protocol === 'telnet') {
        await state.connectTelnet(tab.sessionId, tab.label.replace('Telnet: ', ''), 80, 24);
      } else if (tab.protocol === 'serial') {
        await state.connectSerial(tab.sessionId, tab.label.replace('Serial: ', ''));
      }
    } catch (e) {
      console.error('Failed to duplicate tab:', e);
    }
  },

  renameTab: (connId, label) => {
    set((state) => ({
      tabs: state.tabs.map((t) => t.id === connId ? { ...t, label } : t),
    }));
  },

  reconnectTab: async (connId) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === connId);
    if (!tab || !tab.sessionId) return null;

    try {
      let newConnId: string | null = null;
      const baseName = tab.label
        .replace(' (closed)', '')
        .replace(/^SSH: |^Telnet: |^Serial: /, '');

      if (tab.protocol === 'ssh') {
        newConnId = await wailsCall('ConnectSSH', tab.sessionId, 80, 24);
      } else if (tab.protocol === 'telnet') {
        newConnId = await wailsCall('ConnectTelnet', tab.sessionId, 80, 24);
      } else if (tab.protocol === 'serial') {
        newConnId = await wailsCall('ConnectSerial', tab.sessionId);
      }

      if (newConnId) {
        // Replace old tab with new connection
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === connId
              ? { ...t, id: newConnId!, isConnected: true, connectedAt: Date.now(), label: tab.label.replace(' (closed)', '') }
              : t
          ),
          activeTabId: state.activeTabId === connId ? newConnId : state.activeTabId,
          statusText: `Reconnected: ${baseName}`,
        }));
      }
      return newConnId;
    } catch (e) {
      console.error('Reconnect failed:', e);
      return null;
    }
  },
}));
