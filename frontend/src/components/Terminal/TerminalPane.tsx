import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime';
import { useConnectionStore } from '../../stores/connectionStore';
import { useSettingsStore, THEMES } from '../../stores/settingsStore';

interface TerminalPaneProps {
  connId: string;
  isActive: boolean;
  visible?: boolean; // For split mode: show even if not active
}

export default function TerminalPane({ connId, isActive, visible }: TerminalPaneProps) {
  const isVisible = visible !== undefined ? visible : isActive;
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const sendInput = useConnectionStore((s) => s.sendInput);
  const resizeTerminal = useConnectionStore((s) => s.resizeTerminal);
  const removeTab = useConnectionStore((s) => s.removeTab);
  const appSettings = useSettingsStore((s) => s.settings);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const themeColors = THEMES[appSettings.theme] || THEMES.dark;
    const term = new Terminal({
      cursorBlink: appSettings.cursorBlink,
      cursorStyle: appSettings.cursorStyle as 'block' | 'underline' | 'bar',
      fontSize: appSettings.fontSize,
      fontFamily: appSettings.fontFamily,
      theme: {
        background: themeColors.background,
        foreground: themeColors.foreground,
        cursor: themeColors.cursor,
        selectionBackground: themeColors.selectionBackground,
        black: themeColors.black,
        red: themeColors.red,
        green: themeColors.green,
        yellow: themeColors.yellow,
        blue: themeColors.blue,
        magenta: themeColors.magenta,
        cyan: themeColors.cyan,
        white: themeColors.white,
      },
      scrollback: appSettings.scrollbackLines,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current = fitAddon;
    searchRef.current = searchAddon;

    // Delayed fit to ensure container has dimensions
    requestAnimationFrame(() => {
      fitAddon.fit();
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
      searchRef.current = null;
    };
  }, [connId]);

  // Listen for terminal data from Go backend
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

  // Keyboard shortcut: Ctrl+Shift+F to toggle search
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowSearch((prev) => {
          if (!prev) {
            // Opening search - focus input after render
            setTimeout(() => searchInputRef.current?.focus(), 50);
          } else {
            // Closing search - clear highlights and focus terminal
            searchRef.current?.clearDecorations();
            termRef.current?.focus();
          }
          return !prev;
        });
      }
      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        searchRef.current?.clearDecorations();
        termRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, showSearch]);

  // Fit terminal when visible or window resizes
  useEffect(() => {
    if (!isVisible || !fitRef.current || !termRef.current) return;

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
  }, [isVisible, connId]);

  // Focus terminal when active
  useEffect(() => {
    if (isActive && termRef.current && !showSearch) {
      termRef.current.focus();
    }
  }, [isActive, showSearch]);

  const handleSearch = (direction: 'next' | 'prev') => {
    if (!searchRef.current || !searchQuery) return;
    if (direction === 'next') {
      searchRef.current.findNext(searchQuery);
    } else {
      searchRef.current.findPrevious(searchQuery);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(e.shiftKey ? 'prev' : 'next');
    }
    if (e.key === 'Escape') {
      setShowSearch(false);
      searchRef.current?.clearDecorations();
      termRef.current?.focus();
    }
  };

  return (
    <div
      style={{
        display: isVisible ? 'block' : 'none',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Search bar */}
      {showSearch && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 20,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: '#252526',
            border: '1px solid #3c3c3c',
            borderRadius: 4,
            padding: '4px 8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value && searchRef.current) {
                searchRef.current.findNext(e.target.value);
              }
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Find..."
            style={{
              background: '#3c3c3c',
              color: '#cccccc',
              border: '1px solid #555',
              borderRadius: 3,
              padding: '3px 8px',
              fontSize: 13,
              width: 200,
              outline: 'none',
            }}
          />
          <button
            onClick={() => handleSearch('prev')}
            title="Previous (Shift+Enter)"
            style={{
              background: 'none',
              border: 'none',
              color: '#cccccc',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
            }}
          >
            &#9650;
          </button>
          <button
            onClick={() => handleSearch('next')}
            title="Next (Enter)"
            style={{
              background: 'none',
              border: 'none',
              color: '#cccccc',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
            }}
          >
            &#9660;
          </button>
          <button
            onClick={() => {
              setShowSearch(false);
              searchRef.current?.clearDecorations();
              termRef.current?.focus();
            }}
            title="Close (Esc)"
            style={{
              background: 'none',
              border: 'none',
              color: '#cccccc',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
            }}
          >
            &#10005;
          </button>
        </div>
      )}

      {/* Terminal container */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </div>
  );
}
