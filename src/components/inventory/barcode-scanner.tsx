"use client";

import * as React from "react";
import {
  Camera,
  CameraOff,
  Barcode,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface BarcodeScannerProps {
  onScan: (scannedCode: string) => void;
  expectedComponentCode?: string;
  expectedComponentName?: string;
  suggestedSerials?: string[];
  placeholder?: string;
  title?: string;
}

export function BarcodeScanner({
  onScan,
  expectedComponentCode,
  expectedComponentName,
  suggestedSerials = [],
  placeholder = "Scan barcode or enter serial manually...",
  title = "Device Camera & Barcode Scanner",
}: BarcodeScannerProps) {
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [manualCode, setManualCode] = React.useState("");
  const [lastScanned, setLastScanned] = React.useState<string | null>(null);
  const [scanSuccessFeedback, setScanSuccessFeedback] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const detectorRef = React.useRef<unknown | null>(null);
  const scanIntervalRef = React.useRef<number | null>(null);

  // Initialize BarcodeDetector if available in browser
  React.useEffect(() => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        // @ts-expect-error - BarcodeDetector is a modern browser API
        detectorRef.current = new window.BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a"],
        });
      } catch {
        detectorRef.current = null;
      }
    }
  }, []);

  const triggerScan = React.useCallback(
    (code: string) => {
      const clean = code.trim();
      if (!clean) return;

      setLastScanned(clean);
      setScanSuccessFeedback(true);
      setTimeout(() => setScanSuccessFeedback(false), 1200);

      onScan(clean);
      setManualCode("");
    },
    [onScan]
  );

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser environment. Use manual entry below.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);

      // Start continuous barcode detection loop
      if (detectorRef.current && videoRef.current) {
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || !detectorRef.current) return;
          try {
            // @ts-expect-error - BarcodeDetector detect() method
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue && rawValue !== lastScanned) {
                triggerScan(rawValue);
              }
            }
          } catch {
            // Continuous frame scanning error ignored
          }
        }, 500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to access device camera";
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  const stopCamera = React.useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      triggerScan(manualCode.trim());
    }
  };

  return (
    <Card className="border border-border p-4 bg-card/60 backdrop-blur-xs space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Barcode className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            {expectedComponentName && (
              <p className="text-[11px] text-muted-foreground font-mono">
                Target: {expectedComponentName} ({expectedComponentCode})
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCameraActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10"
              onClick={stopCamera}
            >
              <CameraOff className="w-3.5 h-3.5 mr-1" />
              Stop Camera
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10"
              onClick={startCamera}
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              Open Camera
            </Button>
          )}
        </div>
      </div>

      {/* Live Video Camera Viewport */}
      {isCameraActive && (
        <div className="relative w-full h-56 bg-black rounded-lg overflow-hidden border border-border shadow-inner flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Animated Laser Scanning Line */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="relative w-64 h-32 border-2 border-primary/70 rounded-lg">
              <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-bounce" />
              <div className="absolute -bottom-6 inset-x-0 text-center text-[10px] text-white/80 font-mono tracking-wider">
                ALIGN BARCODE / QR CODE
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera permission or hardware warning */}
      {cameraError && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Device Camera Unavailable</p>
            <p className="text-[11px] opacity-90">{cameraError}</p>
            <p className="text-[10px] opacity-80">Use the manual input field or quick select buttons below.</p>
          </div>
        </div>
      )}

      {/* Scan Feedback Banner */}
      {scanSuccessFeedback && lastScanned && (
        <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-2 animate-in fade-in zoom-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            Scanned: <strong>{lastScanned}</strong>
          </span>
        </div>
      )}

      {/* Manual Input Form */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Keyboard className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={placeholder}
            className="pl-9 h-9 text-xs font-mono"
          />
        </div>
        <Button
          type="submit"
          disabled={!manualCode.trim()}
          size="sm"
          className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <QrCode className="w-3.5 h-3.5 mr-1.5" />
          Scan Unit
        </Button>
      </form>

      {/* Quick Select Buttons for In-Stock Available Serials (Ideal for Hackathon demo & testing) */}
      {suggestedSerials.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Available Warehouse Stock ({suggestedSerials.length} units in bay):
            </span>
            <span className="text-[10px]">Click to quick scan</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {suggestedSerials.map((sn) => (
              <button
                key={sn}
                type="button"
                onClick={() => triggerScan(sn)}
                className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border text-[11px] font-mono text-foreground font-medium transition-colors flex items-center gap-1"
                title={`Scan ${sn}`}
              >
                <Barcode className="w-3 h-3 opacity-70" />
                {sn}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
