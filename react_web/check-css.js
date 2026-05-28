import fs from 'fs';

const css = fs.readFileSync('src/styles/evaluation.css', 'utf-8');
const lines = css.split('\n');

// Look for rules with issues
let braceDepth = 0;
let prevLine = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const openCount = (line.match(/{/g) || []).length;
  const closeCount = (line.match(/}/g) || []).length;
  
  braceDepth += openCount - closeCount;
  
  // Check for orphaned properties or weird structure
  if (braceDepth > 0 && line.trim() && !line.includes('{')) {
    if (line.match(/^\s*[a-z-]+:/) && !prevLine.trim().endsWith('{')) {
      console.log(`Potential issue at line ${i+1}:`);
      console.log(`  Previous: ${prevLine.trim().substring(0, 60)}`);
      console.log(`  Current:  ${line.trim()}`);
      console.log('');
    }
  }
  
  if (braceDepth < 0) {
    console.log(`ERROR: Brace depth went negative at line ${i+1}!`);
  }
  
  prevLine = line;
}

console.log(`Final brace depth: ${braceDepth} (should be 0)`);
