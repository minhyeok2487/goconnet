import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime';
import { useConnectionStore } from '../../stores/connectionStore';

interface TerminalPaneProps {
  connId: string;
  isActive: boolean;
}

export default function TerminalPane({ connId, isActive }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sendInput = useConnectionStore((s) => s.sendInput);
  const resizeTerminal = useConnectionStore((s) => s.resizeTerminal);
  const removeTab = useConnectionStore((s) => s.removeTab);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
      },
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current = fitAddon;

    // Delayed fit to ensure container has dimensions
    requestAnimationFrame(() => {
      fitAddon.fit();
      // Second fit after a small delay for good measure
      setTimeout(() => fitAddon.fit(), 100);
    });

    // Handle user input -> send raw string to Go (no base64)
    term.onData((data) => {
      sendInput(connId, data);
    });

    // Handle binary data (for special keys)
    term.onBinary((data) => {
      sendInput(connId, data);
    });

    // Send initial size
    const { cols, rows } = term;
    resizeTerminal(connId, cols, rows);

    return () => {
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [connId]);

  // Listen for terminal data from Go backend
  // Wails EventsEmit sends separate args: EventsEmit(ctx, "event", arg1, arg2)
  // EventsOn receives them as separate callback parameters
  useEffect(() => {
    const handler = (eventConnId: string, data: string) => {
      if (eventConnId === connId && termRef.current) {
        termRef.current.write(data);
      }
    };

    const closedHandler = (eventConnId: string, errMsg: string) => {
      if (eventConnId === connId && termRef.current) {
        if (errMsg) {
          termRef.current.write(`\r\n\x1b[31mError: ${errMsg}\x1b[0m\r\n`);
        } else {
          termRef.current.write('\r\n\x1b[33mConnection closed.\x1b[0m\r\n');
        }
      }
    };

    EventsOn('terminal:data', handler);
    EventsOn('terminal:closed', closedHandler);

    return () => {
      EventsOff('terminal:data');
      EventsOff('terminal:closed');
    };
  }, [connId]);

  // Fit terminal when tab becomes active or window resizes
  useEffect(() => {
    if (!isActive || !fitRef.current || !termRef.current) return;

    const doFit = () => {
      if (fitRef.current && termRef.current && containerRef.current) {
        try {
          fitRef.current.fit();
          const { cols, rows } = termRef.current;
          resizeTerminal(connId, cols, rows);
        } catch {
          // ignore fit errors during transitions
        }
      }
    };

    // Small delay to let layout settle
    const timer = setTimeout(doFit, 50);

    const resizeObserver = new ResizeObserver(() => {
      doFit();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [isActive, connId]);

  // Focus terminal when active
  useEffect(() => {
    if (isActive && termRef.current) {
      termRef.current.focus();
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      style={{
        display: isActive ? 'block' : 'none',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    />
  );
}
