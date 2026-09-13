import JSZip from 'jszip';

export interface ExtractedFileEntry {
  path: string;
  filename: string;
  extension: string;
  size: number;
  readText: () => Promise<string>;
}

export interface ExtractionLimits {
  maxCompressedBytes?: number;
  maxDecompressedBytes?: number;
  maxFileCount?: number;
}

export const DEFAULT_EXTRACTION_LIMITS: Required<ExtractionLimits> = {
  maxCompressedBytes: 2500 * 1024 * 1024, // 2.5 GB (standard 2 GB Takeout files)
  maxDecompressedBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  maxFileCount: 100000,
};

/**
 * Sanitizes an archive file path to prevent directory traversal and invalid paths.
 */
export function sanitizeArchivePath(rawPath: string): string {
  // Normalize slashes
  let clean = rawPath.replace(/\\/g, '/');
  // Strip leading slashes and drive letters
  clean = clean.replace(/^[a-zA-Z]:\//, '').replace(/^\/+/, '');
  // Resolve / eliminate '../' and './'
  const segments = clean.split('/').filter(Boolean);
  const safeSegments: string[] = [];
  for (const seg of segments) {
    if (seg === '..') {
      safeSegments.pop();
    } else if (seg !== '.') {
      // Truncate segment if unusually long
      safeSegments.push(seg.slice(0, 255));
    }
  }
  return safeSegments.join('/');
}

/**
 * Detects whether data is a ZIP archive, checking filename, MIME type, and PK\x03\x04 magic bytes.
 * Does NOT depend on the filename having a .zip extension.
 */
export async function isZipArchive(data: File | Blob | ArrayBuffer | Uint8Array): Promise<boolean> {
  if (typeof File !== 'undefined' && data instanceof File) {
    if (data.name.toLowerCase().endsWith('.zip')) return true;
    if (data.type === 'application/zip' || data.type === 'application/x-zip-compressed' || data.type === 'multipart/x-zip') {
      return true;
    }
    try {
      const slice = data.slice(0, 4);
      const buf = await slice.arrayBuffer();
      const bytes = new Uint8Array(buf);
      return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    } catch {
      return false;
    }
  }

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const slice = data.slice(0, 4);
      const buf = await slice.arrayBuffer();
      const bytes = new Uint8Array(buf);
      return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    } catch {
      return false;
    }
  }

  if (data instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))) {
    const bytes = data as Uint8Array;
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }

  if (data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(data);
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }

  return false;
}

/**
 * Safely extracts a ZIP archive in-memory on the client device.
 * Enforces strict limits against ZIP bombs, path traversal, and decompression exhaustion.
 */
export async function extractZipArchive(
  data: File | Blob | ArrayBuffer | Uint8Array,
  onProgress?: (stage: string, percent?: number) => void,
  limits: ExtractionLimits = DEFAULT_EXTRACTION_LIMITS
): Promise<ExtractedFileEntry[]> {
  const maxCompressed = limits.maxCompressedBytes ?? DEFAULT_EXTRACTION_LIMITS.maxCompressedBytes;
  const maxDecompressed = limits.maxDecompressedBytes ?? DEFAULT_EXTRACTION_LIMITS.maxDecompressedBytes;
  const maxFiles = limits.maxFileCount ?? DEFAULT_EXTRACTION_LIMITS.maxFileCount;

  if (typeof File !== 'undefined' && data instanceof File && data.size > maxCompressed) {
    throw new Error(
      `Archive size (${(data.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum permitted limit of ${(maxCompressed / (1024 * 1024)).toFixed(0)} MB.`
    );
  }

  if (onProgress) onProgress('Reading archive structure...');

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`We couldn't read this ZIP file. It may be corrupted or malformed. (${msg})`);
  }

  const allZipEntries = Object.entries(zip.files);
  const fileEntries = allZipEntries.filter(([, file]) => !file.dir);

  if (fileEntries.length === 0) {
    throw new Error('This ZIP archive is empty (contains no files).');
  }

  if (fileEntries.length > maxFiles) {
    throw new Error(
      `Archive contains too many files (${fileEntries.length}). Maximum supported file count is ${maxFiles}.`
    );
  }

  const results: ExtractedFileEntry[] = [];
  let totalDecompressedBytes = 0;

  for (let i = 0; i < fileEntries.length; i++) {
    const [rawPath, zipObject] = fileEntries[i];
    const safePath = sanitizeArchivePath(rawPath);
    if (!safePath) continue;

    const parts = safePath.split('/');
    const filename = parts[parts.length - 1];
    const extMatch = filename.match(/\.([0-9a-zA-Z_-]+)$/);
    const extension = extMatch ? extMatch[1].toLowerCase() : '';

    // Estimated decompressed size from zip metadata if available
    const uncompressedSize =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zipObject as any)._data?.uncompressedSize ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zipObject as any).uncompressedSize ||
      0;

    totalDecompressedBytes += uncompressedSize;
    if (totalDecompressedBytes > maxDecompressed) {
      throw new Error(
        `Decompressed archive size exceeds maximum safe limit of ${(maxDecompressed / (1024 * 1024)).toFixed(0)} MB.`
      );
    }

    if (i % 15 === 0) {
      // Yield to browser event loop to keep animations and UI completely responsive
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (onProgress && (i % 15 === 0 || i === fileEntries.length - 1)) {
      onProgress(
        `Discovering files (${i + 1}/${fileEntries.length})...`,
        Math.round(((i + 1) / fileEntries.length) * 100)
      );
    }

    // Lazy reader for file content to avoid decompressing all files into RAM simultaneously
    const readText = async (): Promise<string> => {
      try {
        return await zipObject.async('text');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed reading text from "${filename}": ${msg}`);
      }
    };

    results.push({
      path: safePath,
      filename,
      extension,
      size: uncompressedSize,
      readText,
    });
  }

  if (onProgress) onProgress('Archive contents discovered.', 100);

  return results;
}
