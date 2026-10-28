"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

export type CameraState =
  | "INITIALIZING"
  | "RUNNING"
  | "PERMISSION_DENIED"
  | "UNAVAILABLE"
  | "STOPPED";

export function useCameraScanner(onScanSuccess: (decodedText: string) => void) {
  const [cameraState, setCameraState] = useState<CameraState>("INITIALIZING");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState("");

  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScanSuccess);

  useEffect(() => {
    onScanRef.current = onScanSuccess;
  }, [onScanSuccess]);

  const stopCamera = useCallback(async () => {
    if (qrCodeRef.current) {
      try {
        if (qrCodeRef.current.isScanning) {
          await qrCodeRef.current.stop();
        }
      } catch (err) {
        console.warn("Scanner stop warning:", err);
      }
      qrCodeRef.current = null;
    }
    setCameraState("STOPPED");
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState("INITIALIZING");
    setCameraError(null);

    await stopCamera();

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraState("UNAVAILABLE");
      setCameraError("Camera API is not supported in this browser or context requires HTTPS.");
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode("reader");
      qrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => onScanRef.current(decodedText),
        () => {} // silence per-frame non-detection logs
      );

      setCameraState("RUNNING");
    } catch (err: any) {
      console.warn("Camera start failed, falling back:", err);
      const errStr = String(err).toLowerCase();
      if (errStr.includes("notallowed") || errStr.includes("permission")) {
        setCameraState("PERMISSION_DENIED");
        setCameraError("Camera permission denied. Please enable camera access in browser settings.");
      } else {
        setCameraState("UNAVAILABLE");
        setCameraError(err.message || "Failed to start camera device.");
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return {
    cameraState,
    cameraError,
    showManualInput,
    setShowManualInput,
    manualTokenInput,
    setManualTokenInput,
    startCamera,
    stopCamera,
  };
}
