import { readFileSync, writeFileSync, readdirSync } from 'fs';

const files = readdirSync('src').filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const content = readFileSync(`src/${file}`, 'utf-8');
  let fixed = content;

  // Fix unquoted messages
  fixed = fixed.replace(/msg:\s*([^',}\s][^},]*?)(\s*[},])/g, (match, msg, delimiter) => {
    const cleanMsg = msg.trim();
    return `msg: '${cleanMsg}'${delimiter}`;
  });

  if (content !== fixed) {
    writeFileSync(`src/${file}`, fixed);
    console.log(`Fixed: ${file}`);
  }
});