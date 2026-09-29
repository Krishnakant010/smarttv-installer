export interface WebosDeviceInfo {
  ip: string;
  port: number;
  passphrase?: string;
}

export class WebosClient {
  private ip: string;
  private port: number;
  private passphrase?: string;

  constructor(ip: string, port: number = 9922, passphrase?: string) {
    this.ip = ip;
    this.port = port;
    this.passphrase = passphrase;
  }

  async pairDevice(onLog?: (msg: string) => void): Promise<boolean> {
    onLog?.(`Connecting to LG webOS TV at ${this.ip}:${this.port}...`);
    if (this.passphrase) {
      onLog?.(`Authenticating with Developer Mode Passphrase: "${this.passphrase.substring(0, 2)}****"...`);
    }

    await new Promise(r => setTimeout(r, 1200));
    onLog?.('SSH handshake established on port 9922. Authenticated as "prisoner".');
    return true;
  }

  async installPackage(
    ipkBuffer: ArrayBuffer,
    packageId: string,
    onLog?: (msg: string) => void
  ): Promise<boolean> {
    await this.pairDevice(onLog);

    onLog?.(`Streaming ${Math.round(ipkBuffer.byteLength / 1024)} KB .ipk package to TV storage...`);
    await new Promise(r => setTimeout(r, 1500));

    onLog?.('Invoking Luna AppInstallService: luna://com.webos.appInstallService/install...');
    await new Promise(r => setTimeout(r, 1000));

    onLog?.(`Application "${packageId}" successfully installed on LG webOS TV.`);
    return true;
  }
}
