import React from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Camera barcode reader for browsers implementing the native BarcodeDetector API. */
export default function CameraBarcodeScanner({ onScan, disabled = false }) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const onScanRef = React.useRef(onScan);
  onScanRef.current = onScan;
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const frameRef = React.useRef(null);
  const activeRef = React.useRef(false);
  const lastReadRef = React.useRef("");

  React.useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    activeRef.current = true;
    setError("");
    const stop = () => {
      activeRef.current = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    const start = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError("Camera access requires HTTPS or localhost and a browser with camera support.");
        return;
      }
      if (!("BarcodeDetector" in window)) {
        setError("This browser does not support camera barcode detection. Try Chrome/Edge on a supported device, or use a USB scanner or manual barcode entry.");
        return;
      }
      try {
        const supported = typeof window.BarcodeDetector.getSupportedFormats === "function"
          ? await window.BarcodeDetector.getSupportedFormats() : [];
        const preferred = ["code_39", "code_128", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"];
        const formats = preferred.filter((format) => supported.includes(format));
        const detector = new window.BarcodeDetector(formats.length ? { formats } : {});
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) { stop(); return; }
        video.srcObject = stream;
        await video.play();
        const detect = async () => {
          if (!activeRef.current || cancelled) return;
          try {
            if (video.readyState >= 2) {
              const matches = await detector.detect(video);
              const code = String(matches?.[0]?.rawValue || "").trim();
              if (code && code !== lastReadRef.current) {
                lastReadRef.current = code;
                stop();
                setOpen(false);
                onScanRef.current?.(code);
                return;
              }
            }
          } catch (scanError) {
            // Individual frame failures are transient; continue scanning.
          }
          if (activeRef.current && !cancelled) frameRef.current = requestAnimationFrame(detect);
        };
        frameRef.current = requestAnimationFrame(detect);
      } catch (cameraError) {
        if (!cancelled) setError(cameraError?.message || "Unable to access the camera.");
        stop();
      }
    };
    start();
    return () => { cancelled = true; stop(); };
  }, [open]);

  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => { lastReadRef.current = ""; setOpen(true); }}>
        <Camera className="mr-2 h-4 w-4" /> Scan Barcode
      </Button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Scan product barcode" className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-4 text-slate-900 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Scan Product Barcode</h3>
              <button type="button" aria-label="Close barcode scanner" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <video ref={videoRef} muted playsInline autoPlay className="aspect-video w-full rounded-lg bg-slate-900 object-cover" />
            {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : <p className="mt-3 text-sm text-slate-600">Point the camera at the barcode. The matching product will be selected automatically.</p>}
            <div className="mt-3 flex justify-end"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button></div>
          </div>
        </div>
      )}
    </>
  );
}
