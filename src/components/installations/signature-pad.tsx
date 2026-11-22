"use client";

import * as React from "react";
import { Eraser, Check, Star, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SignaturePadProps {
  signerName: string;
  onSignerNameChange: (name: string) => void;
  onSignatureCapture: (svgData: string) => void;
  rating?: number;
  onRatingChange?: (rating: number) => void;
  comments?: string;
  onCommentsChange?: (comments: string) => void;
}

export function SignaturePad({
  signerName,
  onSignerNameChange,
  onSignatureCapture,
  rating = 5,
  onRatingChange,
  comments = "",
  onCommentsChange,
}: SignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasDrawn, setHasDrawn] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0f172a"; // Dark navy ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Export signature as Data URL / SVG
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      onSignatureCapture(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureCapture("");
  };

  return (
    <div className="space-y-4">
      {/* Signer Name Input */}
      <div>
        <label className="font-semibold text-foreground text-xs block mb-1">
          Customer Full Name *
        </label>
        <div className="relative">
          <User className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="e.g. Simranjeet Kaur"
            value={signerName}
            onChange={(e) => onSignerNameChange(e.target.value)}
            className="pl-9 h-9 text-xs"
            required
          />
        </div>
      </div>

      {/* Touch/Mouse Signature Canvas */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-semibold text-foreground text-xs">
            Digital Signature * (Sign inside the box below)
          </label>
          {hasDrawn && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSignature}
              className="h-6 text-[11px] text-muted-foreground hover:text-red-500 px-2"
            >
              <Eraser className="w-3 h-3 mr-1" /> Clear Ink
            </Button>
          )}
        </div>

        <div className="relative w-full h-36 bg-white rounded-lg border-2 border-dashed border-border shadow-inner overflow-hidden touch-none flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={480}
            height={144}
            className="w-full h-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 font-medium">
              Draw customer signature here with finger or stylus
            </div>
          )}

          <div className="absolute bottom-2 left-3 pointer-events-none text-[10px] text-slate-400 font-mono">
            X ________________________________________
          </div>
        </div>
      </div>

      {/* Customer Satisfaction Rating */}
      {onRatingChange && (
        <div>
          <label className="font-semibold text-foreground text-xs block mb-1">
            Installation Quality Rating
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onRatingChange(star)}
                className="p-1 hover:scale-110 transition-transform"
                title={`${star} Star`}
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
            <span className="text-xs font-mono font-bold text-foreground ml-2">
              {rating}.0 / 5.0
            </span>
          </div>
        </div>
      )}

      {/* Optional Feedback */}
      {onCommentsChange && (
        <div>
          <label className="font-semibold text-foreground text-xs block mb-1">
            Customer Feedback & Handover Remarks
          </label>
          <textarea
            value={comments}
            onChange={(e) => onCommentsChange(e.target.value)}
            placeholder="Work was completed cleanly and on time..."
            rows={2}
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
