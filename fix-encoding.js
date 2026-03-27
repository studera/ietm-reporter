const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/attachments/AttachmentHandler.ts', 'utf8');

// Find and replace the problematic lines (369-374)
// We need to replace the entire escapedOutput assignment
const searchPattern = /const escapedOutput = testOutput\s+\.replace\(\/&\/g,[\s\S]*?\.replace\(\/\'\/g,[^)]+\);/;

const replacement = `const escapedOutput = testOutput
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, ''');`;

content = content.replace(searchPattern, replacement);

// Write back
fs.writeFileSync('src/attachments/AttachmentHandler.ts', content, 'utf8');

console.log('Fixed encoding issues in AttachmentHandler.ts');

// Made with Bob
