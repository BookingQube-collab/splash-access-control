/** Zebra Browser Print global (https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html) */
declare global {
  interface Window {
    BrowserPrint?: {
      getDefaultDevice: (
        type: "printer",
        cb: (device: BrowserPrintDevice | null) => void,
        err?: (e: unknown) => void,
      ) => void;
      getLocalDevices: (
        cb: (devices: BrowserPrintDevice[]) => void,
        err?: (e: unknown) => void,
        type?: string,
      ) => void;
    };
  }
}

export type BrowserPrintDevice = {
  name: string;
  uid: string;
  send: (data: string, onSuccess?: () => void, onError?: (e: unknown) => void) => void;
};

export {};
