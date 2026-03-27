const fs = require('fs');
let content = fs.readFileSync('src/attachments/AttachmentHandler.ts', 'utf8');

// Direct string replacements
content = content.replace(/\.replace\(\/&\/g, '&'\)/g, ".replace(/&/g, '&')");
content = content.replace(/\.replace\(\/</g, '<'\)/g, ".replace(/</g, '<')");
content = content.replace(/\.replace\(\/>/g, '>'\)/g, ".replace(/>/g, '>')");
content = content.replace(/\.replace\(\/"/g, '"'\)/g, ".replace(/\"/g, '"')");
content = content.replace(/\.replace\(\/'/g, '[^)]+\)/g, ".replace(/'/g, ''')");

fs.writeFileSync('src/attachments/AttachmentHandler.ts', content, 'utf8');
console.log('Fixed!');

// Made with Bob
