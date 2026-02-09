import { create } from 'zustand';

const wailsCall = (method: string, ...args: any[]) => {
  return (window as any)['go']['main']['App'][method](...args);
};

export interface MacroStep {
  data: string;
  delay?: number;
}

export interface Macro {
  id: string;
  name: string;
  steps: MacroStep[];
}

interface MacroState {
  macros: Macro[];
  recording: boolean;
  recordedSteps: MacroStep[];
  recordStartTime: number;

  loadMacros: () => Promise<void>;
  createMacro: (name: string, steps: MacroStep[]) => Promise<Macro>;
  deleteMacro: (id: string) => Promise<void>;
  startRecording: () => void;
  recordStep: (data: string) => void;
  stopRecording: () => MacroStep[];
}

export const useMacroStore = create<MacroState>((set, get) => ({
  macros: [],
  recording: false,
  recordedSteps: [],
  recordStartTime: 0,

  loadMacros: async () => {
    try {
      const macros = await wailsCall('GetMacros');
      set({ macros: macros || [] });
    } catch (e) {
      console.error('Failed to load macros:', e);
    }
  },

  createMacro: async (name, steps) => {
    const m = await wailsCall('CreateMacro', { id: '', name, steps });
    set((state) => ({ macros: [...state.macros, m] }));
    return m;
  },

  deleteMacro: async (id) => {
    await wailsCall('DeleteMacro', id);
    set((state) => ({ macros: state.macros.filter((m) => m.id !== id) }));
  },

  startRecording: () => {
    set({ recording: true, recordedSteps: [], recordStartTime: Date.now() });
  },

  recordStep: (data) => {
    const state = get();
    if (!state.recording) return;
    const delay = Date.now() - state.recordStartTime;
    set((s) => ({
      recordedSteps: [...s.recordedSteps, { data, delay }],
      recordStartTime: Date.now(),
    }));
  },

  stopRecording: () => {
    const steps = get().recordedSteps;
    set({ recording: false, recordedSteps: [], recordStartTime: 0 });
    return steps;
  },
}));
