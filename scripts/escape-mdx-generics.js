#!/usr/bin/env node
/**
 * Post-process typedoc-generated markdown to escape TypeScript generics
 * that MDX would otherwise interpret as JSX tags (e.g. Array<number>).
 */
const fs = require('fs');
const path = require('path');

const dir = process.argv[2] || '.';

function escapeGenerics(content) {
  const lines = content.split('\n');
  let inCodeBlock = false;
  return lines.map(line => {
    if (line.startsWith('```')) inCodeBlock = !inCodeBlock;
    if (inCodeBlock) return line;
    return line
      .replace(/Array<(\w+)>/g, 'Array&lt;$1&gt;')
      .replace(/Promise<(\w+)>/g, 'Promise&lt;$1&gt;')
      .replace(/Record<([^>]+)>/g, 'Record&lt;$1&gt;')
      .replace(/Map<([^>]+)>/g, 'Map&lt;$1&gt;')
      .replace(/Set<(\w+)>/g, 'Set&lt;$1&gt;')
      .replace(/<(number|string|boolean|void|null|undefined|T|K|V|E)>/g, '&lt;$1&gt;');
  }).join('\n');
}

function processDir(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.name.endsWith('.md')) {
      const original = fs.readFileSync(fullPath, 'utf8');
      const escaped = escapeGenerics(original);
      if (original !== escaped) {
        fs.writeFileSync(fullPath, escaped);
        console.log('Fixed:', fullPath);
      }
    }
  }
}

processDir(path.resolve(dir));
console.log('Done.');
