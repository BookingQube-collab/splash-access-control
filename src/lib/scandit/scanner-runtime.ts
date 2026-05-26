"use client";

import type { BarcodeCaptureListener } from "@scandit/web-datacapture-barcode";

/** Must match installed @scandit/web-datacapture-barcode version (sdc-lib CDN path). */
const SCANDIT_BARCODE_VERSION = "8.4.0";

export type ScanditScannerHandle = {
  stop: () => Promise<void>;
};

function scanditLibraryLocation(): string {
  return `https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-barcode@${SCANDIT_BARCODE_VERSION}/sdc-lib/`;
}

/** Start Scandit Barcode Capture in `container`; calls `onScan` with decoded payload. */
export async function createScanditScanner(
  container: HTMLElement,
  licenseKey: string,
  onScan: (data: string) => void,
): Promise<ScanditScannerHandle> {
  const SDCCore = await import("@scandit/web-datacapture-core");
  const SDCBarcode = await import("@scandit/web-datacapture-barcode");

  const context = await SDCCore.DataCaptureContext.forLicenseKey(licenseKey.trim(), {
    libraryLocation: scanditLibraryLocation(),
    moduleLoaders: [SDCBarcode.barcodeCaptureLoader()],
  });

  const settings = new SDCBarcode.BarcodeCaptureSettings();
  settings.enableSymbologies([SDCBarcode.Symbology.QR]);
  settings.codeDuplicateFilter = 2500;

  const barcodeCapture = await SDCBarcode.BarcodeCapture.forContext(context, settings);

  const listener: BarcodeCaptureListener = {
    didScan: (_capture, session) => {
      const data = session.newlyRecognizedBarcode?.data;
      if (data) onScan(data);
    },
  };
  barcodeCapture.addListener(listener);

  const camera = SDCCore.Camera.pickBestGuess();
  await camera.applySettings(SDCBarcode.BarcodeCapture.recommendedCameraSettings);
  await context.setFrameSource(camera);

  const view = await SDCCore.DataCaptureView.forContext(context);
  view.connectToElement(container);

  const overlay = await SDCBarcode.BarcodeCaptureOverlay.withBarcodeCaptureForView(
    barcodeCapture,
    view,
  );
  await overlay.setShouldShowScanAreaGuides(false);
  await overlay.setViewfinder(SDCCore.NoViewfinder);

  await barcodeCapture.setEnabled(true);
  const frameSource = context.frameSource;
  if (frameSource) {
    await frameSource.switchToDesiredState(SDCCore.FrameSourceState.On);
  }

  return {
    stop: async () => {
      try {
        await barcodeCapture.setEnabled(false);
        const fs = context.frameSource;
        if (fs) {
          await fs.switchToDesiredState(SDCCore.FrameSourceState.Off);
        }
        view.detachFromElement();
        barcodeCapture.removeListener(listener);
        await context.dispose();
      } catch {
        /* ignore cleanup errors */
      }
    },
  };
}
