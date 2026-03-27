const fs = require('fs');

// Read the file as buffer to see actual bytes
const buffer = fs.readFileSync('src/attachments/AttachmentHandler.ts');
let content = buffer.toString('utf8');

// Show what we have on line 374
const lines = content.split('\n');
console.log('Line 374 before:', JSON.stringify(lines[373]));
console.log('Char codes:', [...lines[373]].map(c => c.charCodeAt(0)));

// Replace the specific problematic section with correct code
// We'll replace from line 369 to 374 (0-indexed: 368-373)
const beforeLines = lines.slice(0, 368);
const afterLines = lines.slice(374);

const fixedLines = [
  '      const escapedOutput = testOutput',
  "        .replace(/&/g, '&')",
  "        .replace(/</g, '<')",
  "        .replace(/>/g, '>')",
  "        .replace(/\"/g, '"')",
  "        .replace(/'/g, ''');"
];

const newContent = [...beforeLines, ...fixedLines, ...afterLines].join('\n');

fs.writeFileSync('src/attachments/AttachmentHandler.ts', newContent, 'utf8');

console.log('Fixed the file');
console.log('Line 374 after:', JSON.stringify(newContent.split('\n')[373]));

// Made with Bob
