/**
 * Attachment Handler Example
 * Demonstrates how to use AttachmentHandler to upload test artifacts to IETM
 */

import { IETMClient } from '../src/client/IETMClient';
import { AttachmentHandler } from '../src/attachments/AttachmentHandler';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  // Initialize IETM client
  const client = new IETMClient({
    qmServerUrl: process.env.IETM_BASE_URL || 'https://jazz.net/sandbox01-qm',
    jtsServerUrl: process.env.IETM_JTS_URL || 'https://jazz.net/jts',
    username: process.env.IETM_USERNAME || '',
    password: process.env.IETM_PASSWORD || '',
    projectName: process.env.IETM_PROJECT || 'Test Project',
  });

  try {
    console.log('Initializing IETM client...\n');

    // Example 1: Basic File Upload
    console.log('=== Example 1: Basic File Upload ===');
    await basicFileUpload(client);

    // Example 2: Upload with File Validation
    console.log('\n=== Example 2: Upload with File Validation ===');
    await uploadWithValidation(client);

    // Example 3: Batch File Upload
    console.log('\n=== Example 3: Batch File Upload ===');
    await batchFileUpload(client);

    // Example 4: Upload Test Artifacts
    console.log('\n=== Example 4: Upload Test Artifacts ===');
    await uploadTestArtifacts(client);

    // Example 5: Progress Tracking
    console.log('\n=== Example 5: Progress Tracking ===');
    await uploadWithProgress(client);

    // Example 6: Custom MIME Types
    console.log('\n=== Example 6: Custom MIME Types ===');
    await uploadWithCustomMimeTypes(client);

    // Example 7: File Size Restrictions
    console.log('\n=== Example 7: File Size Restrictions ===');
    await uploadWithSizeRestrictions(client);

    // Example 8: Upload Statistics
    console.log('\n=== Example 8: Upload Statistics ===');
    await uploadStatistics(client);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function basicFileUpload(client: IETMClient) {
  const handler = new AttachmentHandler(client);

  // Create a temporary test file
  const testFile = createTempFile('test-screenshot.png', 1024);

  try {
    const result = await handler.uploadFile('exec-1', testFile, 'Test screenshot');

    console.log(`Upload ${result.success ? 'successful' : 'failed'}`);
    if (result.success) {
      console.log(`URL: ${result.url}`);
      console.log(`Duration: ${result.duration}ms`);
    } else {
      console.log(`Error: ${result.error}`);
    }
  } finally {
    cleanupTempFile(testFile);
  }
}

async function uploadWithValidation(client: IETMClient) {
  const handler = new AttachmentHandler(client, {
    validateBeforeUpload: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedExtensions: ['.png', '.jpg', '.mp4'],
  });

  // Create test files
  const validFile = createTempFile('valid.png', 1024);
  const invalidFile = createTempFile('invalid.txt', 1024);

  try {
    // Upload valid file
    console.log('Uploading valid file (.png)...');
    const result1 = await handler.uploadFile('exec-1', validFile);
    console.log(`Result: ${result1.success ? 'Success' : 'Failed'}`);

    // Try to upload invalid file
    console.log('\nUploading invalid file (.txt)...');
    const result2 = await handler.uploadFile('exec-1', invalidFile);
    console.log(`Result: ${result2.success ? 'Success' : 'Failed'}`);
    if (!result2.success) {
      console.log(`Error: ${result2.error}`);
    }
  } finally {
    cleanupTempFile(validFile);
    cleanupTempFile(invalidFile);
  }
}

async function batchFileUpload(client: IETMClient) {
  const handler = new AttachmentHandler(client);

  // Create multiple test files
  const file1 = createTempFile('screenshot1.png', 1024);
  const file2 = createTempFile('screenshot2.png', 2048);
  const file3 = createTempFile('screenshot3.png', 1536);
  const files = [file1, file2, file3];

  try {
    const descriptions: Record<string, string> = {
      [file1]: 'Login page screenshot',
      [file2]: 'Dashboard screenshot',
      [file3]: 'Error message screenshot',
    };

    const results = await handler.uploadFiles('exec-1', files, descriptions);

    console.log(`Uploaded ${results.length} files:`);
    results.forEach((result, index) => {
      console.log(
        `  ${index + 1}. ${result.metadata.fileName}: ${result.success ? 'Success' : 'Failed'}`
      );
    });
  } finally {
    files.forEach(cleanupTempFile);
  }
}

async function uploadTestArtifacts(client: IETMClient) {
  const handler = new AttachmentHandler(client);

  // Create test artifacts
  const screenshots = [
    createTempFile('test-screenshot-1.png', 1024),
    createTempFile('test-screenshot-2.png', 2048),
  ];
  const videos = [createTempFile('test-video.mp4', 5120)];
  const traces = [createTempFile('test-trace.zip', 3072)];
  const logs = [createTempFile('test.log', 512)];

  try {
    const results = await handler.uploadTestArtifacts('exec-1', {
      screenshots,
      videos,
      traces,
      logs,
    });

    console.log('Upload Results:');
    console.log(`  Screenshots: ${results.screenshots.length} uploaded`);
    console.log(`  Videos: ${results.videos.length} uploaded`);
    console.log(`  Traces: ${results.traces.length} uploaded`);
    console.log(`  Logs: ${results.logs.length} uploaded`);

    const allResults = [
      ...results.screenshots,
      ...results.videos,
      ...results.traces,
      ...results.logs,
    ];
    const successful = allResults.filter((r) => r.success).length;
    console.log(`\nTotal: ${successful}/${allResults.length} successful`);
  } finally {
    [...screenshots, ...videos, ...traces, ...logs].forEach(cleanupTempFile);
  }
}

async function uploadWithProgress(client: IETMClient) {
  const handler = new AttachmentHandler(client, {
    onProgress: (progress) => {
      console.log(
        `  ${progress.fileName}: ${progress.percentage.toFixed(1)}% ` +
          `(${progress.bytesUploaded}/${progress.totalBytes} bytes)`
      );
    },
  });

  const testFile = createTempFile('large-file.png', 10240);

  try {
    console.log('Uploading with progress tracking...');
    const result = await handler.uploadFile('exec-1', testFile);
    console.log(`Upload ${result.success ? 'completed' : 'failed'}`);
  } finally {
    cleanupTempFile(testFile);
  }
}

async function uploadWithCustomMimeTypes(client: IETMClient) {
  const handler = new AttachmentHandler(client, {
    customMimeTypes: {
      '.har': 'application/json',
      '.trace': 'application/x-playwright-trace',
    },
  });

  const harFile = createTempFile('network.har', 2048);
  const traceFile = createTempFile('test.trace', 4096);

  try {
    console.log('Uploading files with custom MIME types...');

    const result1 = await handler.uploadFile('exec-1', harFile);
    console.log(`HAR file: ${result1.metadata.mimeType}`);

    const result2 = await handler.uploadFile('exec-1', traceFile);
    console.log(`Trace file: ${result2.metadata.mimeType}`);
  } finally {
    cleanupTempFile(harFile);
    cleanupTempFile(traceFile);
  }
}

async function uploadWithSizeRestrictions(client: IETMClient) {
  const handler = new AttachmentHandler(client, {
    maxFileSize: 2 * 1024, // 2KB limit
  });

  const smallFile = createTempFile('small.png', 1024); // 1KB
  const largeFile = createTempFile('large.png', 5120); // 5KB

  try {
    console.log('Testing file size restrictions...');

    const result1 = await handler.uploadFile('exec-1', smallFile);
    console.log(`Small file (1KB): ${result1.success ? 'Accepted' : 'Rejected'}`);

    const result2 = await handler.uploadFile('exec-1', largeFile);
    console.log(`Large file (5KB): ${result2.success ? 'Accepted' : 'Rejected'}`);
    if (!result2.success) {
      console.log(`Reason: ${result2.error}`);
    }
  } finally {
    cleanupTempFile(smallFile);
    cleanupTempFile(largeFile);
  }
}

async function uploadStatistics(client: IETMClient) {
  const handler = new AttachmentHandler(client);

  // Create test files with varying sizes
  const files = [
    createTempFile('file1.png', 1024),
    createTempFile('file2.png', 2048),
    createTempFile('file3.png', 1536),
    createTempFile('file4.png', 3072),
  ];

  try {
    const results = await handler.uploadFiles('exec-1', files);
    const stats = handler.getStatistics(results);

    console.log('Upload Statistics:');
    console.log(`  Total files: ${stats.total}`);
    console.log(`  Successful: ${stats.successful}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Total size: ${AttachmentHandler.formatFileSize(stats.totalSize)}`);
    console.log(`  Total duration: ${stats.totalDuration}ms`);
    console.log(`  Average speed: ${AttachmentHandler.formatSpeed(stats.averageSpeed)}`);
  } finally {
    files.forEach(cleanupTempFile);
  }
}

// Helper functions for creating and cleaning up temporary files
function createTempFile(fileName: string, sizeInBytes: number): string {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filePath = path.join(tempDir, fileName);
  const buffer = Buffer.alloc(sizeInBytes, 'x');
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

function cleanupTempFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Run the examples
main().catch(console.error);

// Made with Bob