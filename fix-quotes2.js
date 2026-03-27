const fs = require('fs');
let content = fs.readFileSync('src/attachments/AttachmentHandler.ts', 'utf8');

// Find and replace the broken line
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("'')//g,")) {
    lines[i] = "        .replace(/'/g, ''');";
    console.log(`Fixed line ${i + 1}`);
  }
}

content = lines.join('\n');
fs.writeFileSync('src/attachments/AttachmentHandler.ts', content, 'utf8');
console.log('Fixed!');

// Made with Bob
