const fs = require('fs');
const content = fs.readFileSync('src/attachments/AttachmentHandler.ts', 'utf8');
const fixed = content.replace(/\.replace\(\/'/g, "''\)/", ".replace(/'/g, ''')");
fs.writeFileSync('src/attachments/AttachmentHandler.ts', fixed, 'utf8');
console.log('Fixed!');

// Made with Bob
