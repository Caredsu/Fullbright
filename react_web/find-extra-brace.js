import fs from 'fs';

const css = fs.readFileSync('src/styles/dashboard.css', 'utf-8');
const lines = css.split('\n');

let depth = 0;
let depthByLine = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const openCount = (line.match(/{/g) || []).length;
  const closeCount = (line.match(/}/g) || []).length;
  
  depth += openCount - closeCount;
  depthByLine.push({line: i + 1, depth: depth, content: line.substring(0, 60)});
  
  if (depth < 0) {
    console.log(`Line ${i + 1}: Depth went negative!`);
    console.log(`  Content: ${line}`);
    console.log(`  Previous 3 lines:`);
    for (let j = Math.max(0, i - 3); j < i; j++) {
      console.log(`    ${j + 1}: ${lines[j].substring(0, 70)}`);
    }
    break;
  }
}

console.log(`\nFinal depth: ${depth}`);
if (depth !== 0) {
  // Find where depth last changed
  let lastNonZero = depthByLine.filter(d => d.depth !== 0).pop();
  console.log(`Last non-zero depth at line ${lastNonZero.line}: depth=${lastNonZero.depth}`);
}
