/**
 * Attachment Handler
 * Manages file uploads to IETM with proper MIME types and progress tracking
 */

import { IETMClient } from '../client/IETMClient';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import FormData from 'form-data';

export interface AttachmentOptions {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;

  /** Allowed file extensions (default: all) */
  allowedExtensions?: string[];

  /** Whether to validate files before upload */
  validateBeforeUpload?: boolean;

  /** Progress callback */
  onProgress?: (progress: UploadProgress) => void;

  /** Custom MIME type mapping */
  customMimeTypes?: Record<string, string>;
}

export interface UploadProgress {
  /** File being uploaded */
  fileName: string;

  /** Bytes uploaded so far */
  bytesUploaded: number;

  /** Total bytes to upload */
  totalBytes: number;

  /** Upload percentage (0-100) */
  percentage: number;

  /** Upload speed in bytes/second */
  speed?: number;
}

export interface AttachmentMetadata {
  /** Original file path */
  filePath: string;

  /** File name */
  fileName: string;

  /** File size in bytes */
  fileSize: number;

  /** MIME type */
  mimeType: string;

  /** File extension */
  extension: string;

  /** Whether file exists */
  exists: boolean;
}

export interface UploadResult {
  /** Whether upload was successful */
  success: boolean;

  /** URL of uploaded attachment */
  url?: string;

  /** Error message if failed */
  error?: string;

  /** File metadata */
  metadata: AttachmentMetadata;

  /** Upload duration in milliseconds */
  duration: number;
}

export class AttachmentHandler {
  private client: IETMClient;
  private options: Required<AttachmentOptions>;

  // Default MIME types for common test artifacts
  private static readonly DEFAULT_MIME_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/avi',
    '.mov': 'video/quicktime',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.log': 'text/plain',
    '.html': 'text/html',
    '.zip': 'application/zip',
    '.pdf': 'application/pdf',
  };

  constructor(client: IETMClient, options: AttachmentOptions = {}) {
    this.client = client;
    this.options = {
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB default
      allowedExtensions: options.allowedExtensions || [],
      validateBeforeUpload: options.validateBeforeUpload !== false,
      onProgress: options.onProgress || (() => {}),
      customMimeTypes: options.customMimeTypes || {},
    };
  }

  /**
   * Upload a single file to IETM
   */
  async uploadFile(
    executionResultId: string,
    filePath: string,
    description?: string
  ): Promise<UploadResult> {
    const startTime = Date.now();
    const metadata = this.getFileMetadata(filePath);

    try {
      // Validate file
      if (this.options.validateBeforeUpload) {
        this.validateFile(metadata);
      }

      // Read file
      const fileBuffer = fs.readFileSync(filePath);

      // Create form data
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: metadata.fileName,
        contentType: metadata.mimeType,
      });

      if (description) {
        formData.append('description', description);
      }

      // Track progress
      let lastProgress = 0;
      formData.on('data', (chunk: Buffer) => {
        lastProgress += chunk.length;
        this.options.onProgress({
          fileName: metadata.fileName,
          bytesUploaded: lastProgress,
          totalBytes: metadata.fileSize,
          percentage: (lastProgress / metadata.fileSize) * 100,
        });
      });

      // Upload to IETM
      const url = await this.uploadToIETM(executionResultId, formData);

      const duration = Date.now() - startTime;

      return {
        success: true,
        url,
        metadata,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMsg,
        metadata,
        duration,
      };
    }
  }

  /**
   * Upload multiple files in batch
   */
  async uploadFiles(
    executionResultId: string,
    filePaths: string[],
    descriptions?: Record<string, string>
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const filePath of filePaths) {
      const description = descriptions?.[filePath];
      const result = await this.uploadFile(executionResultId, filePath, description);
      results.push(result);
    }

    return results;
  }

  /**
   * Upload test artifacts (screenshots, videos, traces)
   */
  async uploadTestArtifacts(
    executionResultId: string,
    artifacts: {
      screenshots?: string[];
      videos?: string[];
      traces?: string[];
      logs?: string[];
    }
  ): Promise<{
    screenshots: UploadResult[];
    videos: UploadResult[];
    traces: UploadResult[];
    logs: UploadResult[];
  }> {
    const results = {
      screenshots: [] as UploadResult[],
      videos: [] as UploadResult[],
      traces: [] as UploadResult[],
      logs: [] as UploadResult[],
    };

    // Upload screenshots
    if (artifacts.screenshots) {
      for (const screenshot of artifacts.screenshots) {
        const result = await this.uploadFile(executionResultId, screenshot, 'Screenshot');
        results.screenshots.push(result);
      }
    }

    // Upload videos
    if (artifacts.videos) {
      for (const video of artifacts.videos) {
        const result = await this.uploadFile(executionResultId, video, 'Video Recording');
        results.videos.push(result);
      }
    }

    // Upload traces
    if (artifacts.traces) {
      for (const trace of artifacts.traces) {
        const result = await this.uploadFile(executionResultId, trace, 'Trace File');
        results.traces.push(result);
      }
    }

    // Upload logs
    if (artifacts.logs) {
      for (const log of artifacts.logs) {
        const result = await this.uploadFile(executionResultId, log, 'Log File');
        results.logs.push(result);
      }
    }

    return results;
  }

  /**
   * Get file metadata
   */
  getFileMetadata(filePath: string): AttachmentMetadata {
    const exists = fs.existsSync(filePath);
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();

    let fileSize = 0;
    if (exists) {
      const stats = fs.statSync(filePath);
      fileSize = stats.size;
    }

    const mimeType = this.getMimeType(extension);

    return {
      filePath,
      fileName,
      fileSize,
      mimeType,
      extension,
      exists,
    };
  }

  /**
   * Get MIME type for file extension
   */
  getMimeType(extension: string): string {
    // Check custom MIME types first
    if (this.options.customMimeTypes[extension]) {
      return this.options.customMimeTypes[extension];
    }

    // Check default MIME types
    if (AttachmentHandler.DEFAULT_MIME_TYPES[extension]) {
      return AttachmentHandler.DEFAULT_MIME_TYPES[extension];
    }

    // Use mime-types library as fallback
    const mimeType = mime.lookup(extension);
    if (mimeType) {
      return mimeType;
    }

    // Default to application/octet-stream
    return 'application/octet-stream';
  }

  /**
   * Validate file before upload
   */
  private validateFile(metadata: AttachmentMetadata): void {
    // Check if file exists
    if (!metadata.exists) {
      throw new Error(`File not found: ${metadata.filePath}`);
    }

    // Check file size
    if (metadata.fileSize > this.options.maxFileSize) {
      throw new Error(
        `File too large: ${metadata.fileName} (${metadata.fileSize} bytes, max ${this.options.maxFileSize} bytes)`
      );
    }

    // Check file size is not zero
    if (metadata.fileSize === 0) {
      throw new Error(`File is empty: ${metadata.fileName}`);
    }

    // Check allowed extensions
    if (this.options.allowedExtensions.length > 0) {
      if (!this.options.allowedExtensions.includes(metadata.extension)) {
        throw new Error(
          `File extension not allowed: ${metadata.extension} (allowed: ${this.options.allowedExtensions.join(', ')})`
        );
      }
    }
  }

  /**
   * Upload form data to IETM
   */
  private async uploadToIETM(executionResultId: string, formData: FormData): Promise<string> {
    // TODO: Implement actual IETM upload
    // This would use the IETMClient to POST the form data to the attachment endpoint
    // For now, return a mock URL
    const mockUrl = `https://ietm.example.com/attachments/${executionResultId}/${Date.now()}`;
    console.log(`[AttachmentHandler] Would upload to: ${mockUrl}`);
    return mockUrl;
  }

  /**
   * Get upload statistics
   */
  getStatistics(results: UploadResult[]): {
    total: number;
    successful: number;
    failed: number;
    totalSize: number;
    totalDuration: number;
    averageSpeed: number;
  } {
    const total = results.length;
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalSize = results.reduce((sum, r) => sum + r.metadata.fileSize, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const averageSpeed = totalDuration > 0 ? totalSize / (totalDuration / 1000) : 0;

    return {
      total,
      successful,
      failed,
      totalSize,
      totalDuration,
      averageSpeed,
    };
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format upload speed for display
   */
  static formatSpeed(bytesPerSecond: number): string {
    return `${AttachmentHandler.formatFileSize(bytesPerSecond)}/s`;
  }
}

// Made with Bob