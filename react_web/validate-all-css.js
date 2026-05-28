import fs from 'fs';
import path from 'path';

const stylesDir = 'src/styles';
const files = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css'));

for (const file of files) {
  const filePath = path.join(stylesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let braceDepth = 0;
  let inRule = false;
  let ruleStart = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Count braces
    const openCount = (line.match(/{/g) || []).length;
    const closeCount = (line.match(/}/g) || []).length;
    
    braceDepth += openCount - closeCount;
    
    // Check for selector without brace (potential issue)
    if (braceDepth === 0 && trimmed && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && !trimmed.endsWith('*/') && trimmed !== '}}') {
      if (trimmed.includes('{')) {
        inRule = true;
        ruleStart = i + 1;
      }
    }
    
    // Check for weird whitespace in pseudo-elements
    if (line.match(/::\s+/) || line.match(/::\s*$/)) {
      console.log(`${file}:${i+1} - Potential pseudo-element issue: ${trimmed}`);
    }
    
    // Check for unmatched braces
    if (braceDepth < 0) {
      console.log(`${file}:${i+1} - ERROR: Brace depth went negative!`);
    }
  }
  
  if (braceDepth !== 0) {
    console.log(`${file} - ERROR: Unbalanced braces! Final depth: ${braceDepth}`);
  }
}
