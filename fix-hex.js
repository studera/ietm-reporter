const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/attachments/AttachmentHandler.ts', 'utf8');

// Split into lines
const lines = content.split('\n');

// Replace lines 369-374 (0-indexed: 368-373) with correct code
lines[368] = '      const escapedOutput = testOutput';
lines[369] = '        .replace(/&/g, ' + String.fromCharCode(39) + '&' + String.fromCharCode(39) + ')';
lines[370] = '        .replace(/</g, ' + String.fromCharCode(39) + '<' + String.fromCharCode(39) + ')';
lines[371] = '        .replace(/>/g, ' + String.fromCharCode(39) + '>' + String.fromCharCode(39) + ')';
lines[372] = '        .replace(/' + String.fromCharCode(92) + String.fromCharCode(34) + '/g, ' + String.fromCharCode(39) + '"' + String.fromCharCode(39) + ')';
lines[373] = '        .replace(/' + String.fromCharCode(39) + '/g, ' + String.fromCharCode(39) + ''' + String.fromCharCode(39) + ');';

// Join back
const newContent = lines.join('\n');

// Write back
fs.writeFileSync('src/attachments/AttachmentHandler.ts', newContent, 'utf8');

console.log('Fixed encoding issues');
console.log('Line 374:', lines[373]);

// Made with Bob
