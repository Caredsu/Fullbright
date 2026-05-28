import fs from 'fs';

let css = fs.readFileSync('src/styles/dashboard.css', 'utf-8');
const lines = css.split('\n');

// Check line 863 (index 862)
console.log(`Line 862: [${lines[861]}]`);
console.log(`Line 863: [${lines[862]}]`);
console.log(`Line 864: [${lines[863]}]`);

// Find lines with just "}" 
let removedCount = 0;
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() === '}' && lines[i-1].trim() === '}') {
    console.log(`Found consecutive closing braces at lines ${i} and ${i+1}`);
    console.log(`  Line ${i}: [${lines[i-1]}]`);
    console.log(`  Line ${i+1}: [${lines[i]}]`);
    // Remove this extra brace
    lines.splice(i, 1);
    removedCount++;
    i--;  // Adjust index after removal
  }
}

css = lines.join('\n');
fs.writeFileSync('src/styles/dashboard.css', css, 'utf-8');
console.log(`\nRemoved ${removedCount} extra braces`);

