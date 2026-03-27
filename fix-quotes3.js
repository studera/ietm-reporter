const fs = require('fs');
let content = fs.readFileSync('src/attachments/AttachmentHandler.ts', 'utf8');

// Replace the entire problematic section
const oldCode = `      const escapedOutput = testOutput
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, ''');`;

const newCode = `      const escapedOutput = testOutput
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, ''');`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  console.log('Replaced old code block');
} else {
  // Try line by line replacement for any remaining issues
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('/g,') && (lines[i].includes("'") || lines[i].includes("'"))) {
      // Fix any line with regex replace that has quote issues
      if (lines[i].includes('&/g')) {
        lines[i] = "        .replace(/&/g, '&')";
      } else if (lines[i].includes('</g')) {
        lines[i] = "        .replace(/</g, '<')";
      } else if (lines[i].includes('>/g')) {
        lines[i] = "        .replace(/>/g, '>')";
      } else if (lines[i].includes('"/g')) {
        lines[i] = "        .replace(/\"/g, '"')";
      } else if (lines[i].includes("'/g")) {
        lines[i] = "        .replace(/'/g, ''');";
      }
      console.log(`Fixed line ${i + 1}: ${lines[i]}`);
    }
  }
  content = lines.join('\n');
}

fs.writeFileSync('src/attachments/AttachmentHandler.ts', content, 'utf8');
console.log('Done!');

// Made with Bob
