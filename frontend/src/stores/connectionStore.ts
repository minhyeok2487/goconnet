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
  setActiveTab: (connId: string) => void;
  closeTab: (connId: string) => void;
  removeTab: (connId: string) => void;
  sendInput: (connId: string, data: string) => Promise<void>;
  resizeTerminal: (connId: string, cols: number, rows: number) => Promise<void>;
  setStatusText: (text: string) => void;
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
        t.id === connId ? { ...t, isConnected: false, label: t.label + ' (closed)' } : t
      ),
      statusText: 'Disconnected',
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
}));
