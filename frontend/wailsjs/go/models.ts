export namespace connection {
	
	export class ConnInfo {
	    connId: string;
	    sessionName: string;
	    protocol: string;
	    host: string;
	    port: number;
	    username: string;
	    cols: number;
	    rows: number;
	
	    static createFrom(source: any = {}) {
	        return new ConnInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connId = source["connId"];
	        this.sessionName = source["sessionName"];
	        this.protocol = source["protocol"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.username = source["username"];
	        this.cols = source["cols"];
	        this.rows = source["rows"];
	    }
	}

}

export namespace session {
	
	export class Folder {
	    id: string;
	    name: string;
	    parentId?: string;
	
	    static createFrom(source: any = {}) {
	        return new Folder(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.parentId = source["parentId"];
	    }
	}
	export class RDPOptions {
	    width: number;
	    height: number;
	    colorDepth: number;
	    fullScreen: boolean;
	    driveRedirect: boolean;
	    clipboardRedirect: boolean;
	    audioRedirect: string;
	
	    static createFrom(source: any = {}) {
	        return new RDPOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.width = source["width"];
	        this.height = source["height"];
	        this.colorDepth = source["colorDepth"];
	        this.fullScreen = source["fullScreen"];
	        this.driveRedirect = source["driveRedirect"];
	        this.clipboardRedirect = source["clipboardRedirect"];
	        this.audioRedirect = source["audioRedirect"];
	    }
	}
	export class SSHOptions {
	    keepAliveInterval: number;
	    compression: boolean;
	    jumpHost?: string;
	    jumpPort?: number;
	    jumpUser?: string;
	
	    static createFrom(source: any = {}) {
	        return new SSHOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.keepAliveInterval = source["keepAliveInterval"];
	        this.compression = source["compression"];
	        this.jumpHost = source["jumpHost"];
	        this.jumpPort = source["jumpPort"];
	        this.jumpUser = source["jumpUser"];
	    }
	}
	export class SerialOptions {
	    portName: string;
	    baudRate: number;
	    dataBits: number;
	    stopBits: number;
	    parity: string;
	    flowCtrl: string;
	
	    static createFrom(source: any = {}) {
	        return new SerialOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.portName = source["portName"];
	        this.baudRate = source["baudRate"];
	        this.dataBits = source["dataBits"];
	        this.stopBits = source["stopBits"];
	        this.parity = source["parity"];
	        this.flowCtrl = source["flowCtrl"];
	    }
	}
	export class Session {
	    id: string;
	    name: string;
	    folderId: string;
	    protocol: string;
	    host: string;
	    port: number;
	    username: string;
	    authMethod: string;
	    keyFilePath?: string;
	    sshOptions?: SSHOptions;
	    rdpOptions?: RDPOptions;
	    serialOptions?: SerialOptions;
	
	    static createFrom(source: any = {}) {
	        return new Session(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.folderId = source["folderId"];
	        this.protocol = source["protocol"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.username = source["username"];
	        this.authMethod = source["authMethod"];
	        this.keyFilePath = source["keyFilePath"];
	        this.sshOptions = this.convertValues(source["sshOptions"], SSHOptions);
	        this.rdpOptions = this.convertValues(source["rdpOptions"], RDPOptions);
	        this.serialOptions = this.convertValues(source["serialOptions"], SerialOptions);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

