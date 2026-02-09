import { create } from 'zustand';
import type { Session, Folder } from '../types';

// Call Wails Go bindings via window.go (injected by Wails runtime)
const wailsCall = (method: string, ...args: any[]) => {
  return (window as any)['go']['main']['App'][method](...args);
};

interface SessionState {
  sessions: Session[];
  folders: Folder[];
  searchQuery: string;
  loading: boolean;

  setSearchQuery: (query: string) => void;
  loadSessions: () => Promise<void>;
  loadFolders: () => Promise<void>;
  createSession: (session: Partial<Session>) => Promise<Session>;
  updateSession: (session: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  createFolder: (folder: Partial<Folder>) => Promise<Folder>;
  updateFolder: (folder: Folder) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  savePassword: (sessionId: string, password: string) => Promise<void>;
  getPassword: (sessionId: string) => Promise<string>;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  folders: [],
  searchQuery: '',
  loading: false,

  setSearchQuery: (query) => set({ searchQuery: query }),

  loadSessions: async () => {
    set({ loading: true });
    try {
      const sessions = await wailsCall('GetSessions');
      set({ sessions: sessions || [] });
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      set({ loading: false });
    }
  },

  loadFolders: async () => {
    try {
      const folders = await wailsCall('GetFolders');
      set({ folders: folders || [] });
    } catch (e) {
      console.error('Failed to load folders:', e);
    }
  },

  createSession: async (session) => {
    const created = await wailsCall('CreateSession', session);
    set((state) => ({ sessions: [...state.sessions, created] }));
    return created;
  },

  updateSession: async (session) => {
    await wailsCall('UpdateSession', session);
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === session.id ? session : s)),
    }));
  },

  deleteSession: async (id) => {
    await wailsCall('DeleteSession', id);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    }));
  },

  createFolder: async (folder) => {
    const created = await wailsCall('CreateFolder', folder);
    set((state) => ({ folders: [...state.folders, created] }));
    return created;
  },

  updateFolder: async (folder) => {
    await wailsCall('UpdateFolder', folder);
    set((state) => ({
      folders: state.folders.map((f) => (f.id === folder.id ? folder : f)),
    }));
  },

  deleteFolder: async (id) => {
    await wailsCall('DeleteFolder', id);
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
    }));
  },

  savePassword: async (sessionId, password) => {
    await wailsCall('SavePassword', sessionId, password);
  },

  getPassword: async (sessionId) => {
    try {
      return await wailsCall('GetPassword', sessionId);
    } catch {
      return '';
    }
  },
}));
