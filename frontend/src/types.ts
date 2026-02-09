// Mirrors Go session.Session
export interface Session {
  id: string;
  name: string;
  folderId: string;
  protocol: 'ssh' | 'telnet' | 'rdp' | 'serial';
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'keyfile' | 'agent';
  keyFilePath?: string;
  sshOptions?: SSHOptions;
  rdpOptions?: RDPOptions;
  serialOptions?: SerialOptions;
}

export interface SSHOptions {
  keepAliveInterval: number;
  compression: boolean;
  jumpHost?: string;
  jumpPort?: number;
  jumpUser?: string;
}

export interface RDPOptions {
  width: number;
  height: number;
  colorDepth: number;
  fullScreen: boolean;
  driveRedirect: boolean;
  clipboardRedirect: boolean;
  audioRedirect: 'local' | 'remote' | 'none';
}

export interface SerialOptions {
  portName: string;  // "COM1", "COM3", etc.
  baudRate: number;  // 9600, 19200, 38400, 57600, 115200
  dataBits: number;  // 7, 8
  stopBits: number;  // 1, 2
  parity: 'none' | 'odd' | 'even' | 'mark' | 'space';
  flowCtrl: 'none' | 'hardware' | 'software';
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
}

// Mirrors Go connection.ConnInfo
export interface ConnInfo {
  connId: string;
  sessionName: string;
  protocol: string;
  host: string;
  port: number;
  username: string;
  cols: number;
  rows: number;
}

// Tab state for the UI
export interface Tab {
  id: string; // connId
  sessionId?: string;
  label: string;
  protocol: string;
  isConnected: boolean;
}
