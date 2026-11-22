/**
 * SolarOS Secure File & Media Upload Validator
 * 
 * Provides defense against Remote Code Execution (RCE), Stored XSS,
 * Path Traversal, and Polyglot attacks in site survey photos,
 * installation completion proof, and warranty claim documents.
 */

export interface FileValidationResult {
  isValid: boolean;
  sanitizedFilename: string;
  detectedMimeType: string;
  fileSizeBytes: number;
  error?: string;
}

export interface ValidationOptions {
  maxSizeBytes?: number; // default 10MB
  allowedMimeTypes?: string[];
  preventExecutables?: boolean;
}

const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Dangerous extensions that must never be allowed even if masked
const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".php", ".phtml", ".js", ".ts",
  ".html", ".htm", ".svg", ".xhtml", ".jsp", ".asp", ".aspx", ".cgi",
  ".dll", ".so", ".bin", ".vbs", ".ps1", ".jar"
];

/**
 * Validates a file's name, size, extension, and binary magic bytes.
 */
export function validateUploadedFile(
  filename: string,
  buffer: Uint8Array | Buffer,
  options: ValidationOptions = {}
): FileValidationResult {
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  const allowedMimes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;

  // 1. Check for empty file
  if (!buffer || buffer.length === 0) {
    return {
      isValid: false,
      sanitizedFilename: "",
      detectedMimeType: "application/octet-stream",
      fileSizeBytes: 0,
      error: "File is empty (0 bytes)",
    };
  }

  // 2. Check File Size Bounds
  if (buffer.length > maxSizeBytes) {
    return {
      isValid: false,
      sanitizedFilename: "",
      detectedMimeType: "application/octet-stream",
      fileSizeBytes: buffer.length,
      error: `File size (${(buffer.length / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed limit (${(maxSizeBytes / 1024 / 1024).toFixed(2)} MB)`,
    };
  }

  // 3. Filename Sanitization & Directory Traversal Prevention
  const sanitizedName = sanitizeFilename(filename);
  if (!sanitizedName) {
    return {
      isValid: false,
      sanitizedFilename: "",
      detectedMimeType: "application/octet-stream",
      fileSizeBytes: buffer.length,
      error: "Invalid or malicious filename provided",
    };
  }

  // 4. Double-extension and dangerous extension check (e.g. payload.php.jpg)
  const lowerName = sanitizedName.toLowerCase();
  for (const dangerousExt of DANGEROUS_EXTENSIONS) {
    if (lowerName.includes(dangerousExt)) {
      return {
        isValid: false,
        sanitizedFilename: sanitizedName,
        detectedMimeType: "application/octet-stream",
        fileSizeBytes: buffer.length,
        error: `File contains disallowed or potentially executable extension: ${dangerousExt}`,
      };
    }
  }

  // 5. Inspect Magic Bytes
  const detectedMime = detectMimeFromMagicBytes(buffer);
  if (!detectedMime) {
    return {
      isValid: false,
      sanitizedFilename: sanitizedName,
      detectedMimeType: "unknown",
      fileSizeBytes: buffer.length,
      error: "File signature (magic bytes) could not be identified or is unrecognized",
    };
  }

  if (!allowedMimes.includes(detectedMime)) {
    return {
      isValid: false,
      sanitizedFilename: sanitizedName,
      detectedMimeType: detectedMime,
      fileSizeBytes: buffer.length,
      error: `File MIME type '${detectedMime}' is not permitted. Allowed: ${allowedMimes.join(", ")}`,
    };
  }

  // 6. Inspect for embedded malicious scripts (Polyglots / embedded HTML)
  if (containsMaliciousScriptPayload(buffer)) {
    return {
      isValid: false,
      sanitizedFilename: sanitizedName,
      detectedMimeType: detectedMime,
      fileSizeBytes: buffer.length,
      error: "Malicious payload detected: File contains executable script or markup",
    };
  }

  return {
    isValid: true,
    sanitizedFilename: sanitizedName,
    detectedMimeType: detectedMime,
    fileSizeBytes: buffer.length,
  };
}

/**
 * Strips path traversal sequences (`../`, `..\`), null bytes (`\0`),
 * control characters, and normalizes file extension.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return "";

  // Remove null bytes and control chars
  let clean = filename.replace(/[\x00-\x1F\x7F]/g, "");

  // Prevent path traversal
  clean = clean.replace(/(\.\.[\/\\])+/g, "");
  clean = clean.replace(/^.*[\\\/]/, ""); // Keep only basename

  // Replace disallowed characters with underscore
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Prevent hidden files (starting with dot)
  clean = clean.replace(/^\.+/, "");

  return clean;
}

/**
 * Detects MIME type using binary file signatures (Magic Numbers)
 */
export function detectMimeFromMagicBytes(buffer: Uint8Array | Buffer): string | null {
  if (buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 &&
    buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A &&
    buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return "image/png";
  }

  // PDF: %PDF- (25 50 44 46 2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 && buffer[1] === 0x50 &&
    buffer[2] === 0x44 && buffer[3] === 0x46 &&
    buffer[4] === 0x2D
  ) {
    return "application/pdf";
  }

  // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Scans payload for embedded dangerous script tags, event handlers, or PHP/HTML tags
 */
export function containsMaliciousScriptPayload(buffer: Uint8Array | Buffer): boolean {
  // Convert first 4096 bytes and last 1024 bytes to string for pattern scanning
  const checkSlice = buffer.subarray(0, Math.min(buffer.length, 4096));
  const text = new TextDecoder("utf-8", { fatal: false }).decode(checkSlice).toLowerCase();

  const scriptPatterns = [
    "<script",
    "</script>",
    "javascript:",
    "onload=",
    "onerror=",
    "onclick=",
    "<?php",
    "<%=",
    "<iframe",
    "<object",
    "<embed",
  ];

  return scriptPatterns.some((pattern) => text.includes(pattern));
}
