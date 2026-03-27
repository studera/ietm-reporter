/**
 * Attachment Handler
 * Manages file uploads to IETM using multipart/form-data
 * Based on Java reference implementation in RqmClient.createAttachment()
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
  private logger: Console;

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
    this.logger = console;
    this.options = {
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB default
      allowedExtensions: options.allowedExtensions || [],
      validateBeforeUpload: options.validateBeforeUpload !== false,
      onProgress: options.onProgress || (() => {}),
      customMimeTypes: options.customMimeTypes || {},
    };
  }

  /**
   * Upload test execution output as text attachment to IETM and link it to execution result
   * Based on Java reference implementation in RqmClient.createAttachment()
   *
   * @param testOutput - The test execution output text
   * @param testName - Name of the test for the attachment filename
   * @param executionResultId - The execution result ID
   * @returns The attachment URL if successful, null otherwise
   */
  async uploadTestOutput(
    testOutput: string,
    testName: string,
    executionResultId: string
  ): Promise<string | null> {
    try {
      const fileName = `${testName.replace(/[^a-zA-Z0-9]/g, '_')}_output.txt`;
      const content = Buffer.from(testOutput, 'utf-8');
      
      this.logger.info(`[AttachmentHandler] Uploading test output for ${testName} (${content.length} bytes)`);
      
      const attachmentUrl = await this.uploadAttachmentFile(content, fileName, executionResultId);
      
      if (!attachmentUrl) {
        return null;
      }
      
      // Link the attachment to the execution result
      const linked = await this.linkAttachmentToExecutionResult(executionResultId, attachmentUrl);
      
      if (!linked) {
        this.logger.warn(`[AttachmentHandler] Attachment uploaded but failed to link to execution result ${executionResultId}`);
        // Still return the URL as the upload was successful
      }
      
      // Also add the test output to the Result Details section
      const detailsAdded = await this.addTestOutputToResultDetails(executionResultId, testOutput, testName);
      
      if (!detailsAdded) {
        this.logger.warn(`[AttachmentHandler] Failed to add test output to Result Details section`);
      }
      
      return attachmentUrl;
    } catch (error) {
      this.logger.error(`[AttachmentHandler] Failed to upload test output for ${testName}:`, error);
      return null;
    }
  }

  /**
   * Link an uploaded attachment to an execution result
   * Uses POST-GET-PUT workflow similar to state updates
   *
   * @param executionResultId - The execution result ID (can be just the number or full URN)
   * @param attachmentUrl - The attachment URL from upload
   * @returns True if successfully linked, false otherwise
   */
  private async linkAttachmentToExecutionResult(
    executionResultId: string,
    attachmentUrl: string
  ): Promise<boolean> {
    try {
      const clientAny = this.client as any;
      const discoveredServices = clientAny.discoveredServices;
      const authManager = clientAny.authManager;
      const axiosInstance = (authManager as any).axiosInstance;

      if (!discoveredServices || !axiosInstance) {
        this.logger.error('[AttachmentHandler] Client not properly initialized for linking');
        return false;
      }

      // Construct execution result URL with full URN format
      // If executionResultId is just a number, add the URN prefix
      const fullExecutionResultId = executionResultId.startsWith('urn:')
        ? executionResultId
        : `urn:com.ibm.rqm:executionresult:${executionResultId}`;
      
      const executionResultUrl = `${discoveredServices.basePath}/executionresult/${fullExecutionResultId}`;

      this.logger.info(`[AttachmentHandler] Linking attachment to execution result ${fullExecutionResultId}...`);

      // Step 1: GET the current execution result XML
      const getResponse = await axiosInstance.request({
        method: 'GET',
        url: executionResultUrl,
        headers: {
          'Accept': 'application/xml',
          'OSLC-Core-Version': '2.0',
        },
      });

      const originalXml = getResponse.data;
      this.logger.debug(`[AttachmentHandler] Retrieved execution result XML`);

      // Step 2: Parse and add attachment reference
      const { XMLParser, XMLBuilder } = require('fast-xml-parser');
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseTagValue: false,
        trimValues: false,
        parseAttributeValue: false,
      });

      const parsed = parser.parse(originalXml);
      
      // Find the execution result node
      let executionResultNode = parsed['ns2:executionresult'] ||
                                parsed['executionresult'] ||
                                parsed['ns6:executionresult'];

      if (!executionResultNode) {
        this.logger.error('[AttachmentHandler] Could not find execution result node in XML');
        return false;
      }

      // Add attachment element
      // Check if attachments array exists
      if (!executionResultNode['ns2:attachment']) {
        executionResultNode['ns2:attachment'] = [];
      }

      // Ensure it's an array
      if (!Array.isArray(executionResultNode['ns2:attachment'])) {
        executionResultNode['ns2:attachment'] = [executionResultNode['ns2:attachment']];
      }

      // Add the new attachment
      executionResultNode['ns2:attachment'].push({
        '@_href': attachmentUrl
      });

      this.logger.info(`[AttachmentHandler] Added attachment reference to XML`);

      // Step 3: Build updated XML
      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        format: true,
        suppressEmptyNode: true,
      });

      const updatedXml = builder.build(parsed);

      // Step 4: PUT the updated XML back
      const putResponse = await axiosInstance.request({
        method: 'PUT',
        url: executionResultUrl,
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/xml',
          'OSLC-Core-Version': '2.0',
        },
        data: updatedXml,
      });

      if (putResponse.status >= 200 && putResponse.status < 300) {
        this.logger.info(`[AttachmentHandler] ✓ Attachment successfully linked to execution result`);
        return true;
      } else {
        this.logger.error(`[AttachmentHandler] Failed to link attachment: HTTP ${putResponse.status}`);
        return false;
      }

    } catch (error: any) {
      this.logger.error('[AttachmentHandler] Error linking attachment:', error.message);
      if (error.response) {
        this.logger.error(`[AttachmentHandler] Response status: ${error.response.status}`);
        this.logger.error(`[AttachmentHandler] Response data:`, error.response.data);
      }
      return false;
    }
  }

  /**
   * Add test output to the Result Details section of an execution result
   * Uses POST-GET-PUT workflow to add <details> element with XHTML content
   *
   * @param executionResultId - The execution result ID
   * @param testOutput - The test output text to add
   * @param testName - The test name for the heading
   * @returns True if successfully added, false otherwise
   */
  private async addTestOutputToResultDetails(
    executionResultId: string,
    testOutput: string,
    testName: string
  ): Promise<boolean> {
    try {
      const clientAny = this.client as any;
      const discoveredServices = clientAny.discoveredServices;
      const authManager = clientAny.authManager;
      const axiosInstance = (authManager as any).axiosInstance;

      if (!discoveredServices || !axiosInstance) {
        this.logger.error('[AttachmentHandler] Client not properly initialized for adding details');
        return false;
      }

      // Construct execution result URL with full URN format
      const fullExecutionResultId = executionResultId.startsWith('urn:')
        ? executionResultId
        : `urn:com.ibm.rqm:executionresult:${executionResultId}`;
      
      const executionResultUrl = `${discoveredServices.basePath}/executionresult/${fullExecutionResultId}`;

      this.logger.info(`[AttachmentHandler] Adding test output to Result Details for ${fullExecutionResultId}...`);

      // Step 1: GET the current execution result XML
      const getResponse = await axiosInstance.request({
        method: 'GET',
        url: executionResultUrl,
        headers: {
          'Accept': 'application/xml',
          'OSLC-Core-Version': '2.0',
        },
      });

      const originalXml = getResponse.data;
      this.logger.debug(`[AttachmentHandler] Retrieved execution result XML`);

      // Step 2: Parse and add/update details element
      const { XMLParser, XMLBuilder } = require('fast-xml-parser');
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseTagValue: false,
        trimValues: false,
        parseAttributeValue: false,
      });

      const parsed = parser.parse(originalXml);
      
      // Find the execution result node
      let executionResultNode = parsed['ns2:executionresult'] ||
                                parsed['executionresult'] ||
                                parsed['ns6:executionresult'];

      if (!executionResultNode) {
        this.logger.error('[AttachmentHandler] Could not find execution result node in XML');
        return false;
      }

      // Convert test output to XHTML
      // Escape HTML special characters and convert newlines to <br/>
      const escapedOutput = testOutput
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      
      const lines = escapedOutput.split('\n');
      const xhtmlContent = lines.map((line: string, index: number) =>
        index < lines.length - 1 ? `${line}<br/>` : line
      ).join('');

      // Create or update the details element
      executionResultNode['details'] = {
        '@_xmlns': 'http://jazz.net/xmlns/alm/qm/v0.1/executionresult/v0.1',
        'div': {
          '@_xmlns': 'http://www.w3.org/1999/xhtml',
          'h3': `Test Output: ${testName}`,
          'pre': {
            '@_style': 'font-family: monospace; white-space: pre-wrap; background-color: #f5f5f5; padding: 10px; border: 1px solid #ddd;',
            '#text': testOutput
          }
        }
      };

      this.logger.info(`[AttachmentHandler] Added test output to details element`);

      // Step 3: Build updated XML
      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        format: true,
        suppressEmptyNode: true,
      });

      const updatedXml = builder.build(parsed);

      // Step 4: PUT the updated XML back
      const putResponse = await axiosInstance.request({
        method: 'PUT',
        url: executionResultUrl,
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/xml',
          'OSLC-Core-Version': '2.0',
        },
        data: updatedXml,
      });

      if (putResponse.status >= 200 && putResponse.status < 300) {
        this.logger.info(`[AttachmentHandler] ✓ Test output successfully added to Result Details`);
        return true;
      } else {
        this.logger.error(`[AttachmentHandler] Failed to add test output: HTTP ${putResponse.status}`);
        return false;
      }

    } catch (error: any) {
      this.logger.error('[AttachmentHandler] Error adding test output to Result Details:', error.message);
      if (error.response) {
        this.logger.error(`[AttachmentHandler] Response status: ${error.response.status}`);
        this.logger.error(`[AttachmentHandler] Response data:`, error.response.data);
      }
      return false;
    }
  }

  /**
   * Upload attachment file using multipart/form-data
   * Matches Java implementation: MultipartEntityBuilder with BROWSER_COMPATIBLE mode
   * Uses field name "upfile" as per RqmClient.createAttachment()
   *
   * @param content - File content as Buffer
   * @param fileName - Name of the file
   * @param executionResultId - The execution result ID (for logging)
   * @returns The attachment URL from Location header, or null if failed
   */
  private async uploadAttachmentFile(
    content: Buffer,
    fileName: string,
    executionResultId: string
  ): Promise<string | null> {
    // Get client internals
    const clientAny = this.client as any;
    const discoveredServices = clientAny.discoveredServices;
    const authManager = clientAny.authManager;

    if (!discoveredServices || !authManager) {
      this.logger.error('[AttachmentHandler] Client not properly initialized');
      return null;
    }

    const attachmentEndpoint = `${discoveredServices.basePath}/attachment/urn:com.ibm.rqm:attachment`;

    try {
      // Detect content type
      const contentType = this.getContentType(fileName);
      
      // Create form data with field name "upfile" (as per Java reference)
      const formData = new FormData();
      formData.append('upfile', content, {
        filename: fileName,
        contentType: contentType
      });

      this.logger.info(`[AttachmentHandler] Uploading to: ${attachmentEndpoint}`);
      this.logger.info(`[AttachmentHandler] File: ${fileName}, Content-Type: ${contentType}, Size: ${content.length} bytes`);
      this.logger.info(`[AttachmentHandler] Execution Result ID: ${executionResultId}`);

      // We need to access the axios instance directly to get response headers
      // The executeRequest method only returns data, not headers
      const axiosInstance = (authManager as any).axiosInstance;
      
      if (!axiosInstance) {
        this.logger.error('[AttachmentHandler] Could not access axios instance');
        return null;
      }

      const response = await axiosInstance.request({
        method: 'POST',
        url: attachmentEndpoint,
        data: formData,
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/xml'
        },
        maxRedirects: 0, // Don't follow redirects to capture Location header
        validateStatus: (status: number) => status >= 200 && status < 400, // Accept 2xx and 3xx
      });

      this.logger.info(`[AttachmentHandler] Response status: ${response.status}`);
      
      // Get attachment URL from Location header (as per Java reference)
      const locationHeader = response.headers['location'] || response.headers['Location'];
      if (!locationHeader) {
        this.logger.error('[AttachmentHandler] No Location header in response');
        this.logger.info(`[AttachmentHandler] Response headers:`, JSON.stringify(response.headers, null, 2));
        this.logger.info(`[AttachmentHandler] Response data:`, response.data);
        return null;
      }

      this.logger.info(`[AttachmentHandler] ✓ Attachment uploaded successfully: ${locationHeader}`);
      return locationHeader;

    } catch (error: any) {
      this.logger.error('[AttachmentHandler] Error uploading attachment:', error.message);
      if (error.response) {
        this.logger.error(`[AttachmentHandler] Response status: ${error.response.status}`);
        this.logger.error(`[AttachmentHandler] Response data:`, error.response.data);
      }
      return null;
    }
  }

  /**
   * Get content type for a file based on extension
   */
  private getContentType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.log': 'text/plain',
      '.xml': 'application/xml',
      '.json': 'application/json',
      '.webm': 'video/webm',
      '.mp4': 'video/mp4'
    };
    return contentTypes[ext] || 'application/octet-stream';
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

      // Read file as buffer
      const fileBuffer = fs.readFileSync(filePath);

      // Upload using multipart/form-data
      const url = await this.uploadAttachmentFile(
        fileBuffer,
        metadata.fileName,
        executionResultId
      );

      const duration = Date.now() - startTime;

      if (!url) {
        return {
          success: false,
          error: 'Failed to upload file',
          metadata,
          duration,
        };
      }

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