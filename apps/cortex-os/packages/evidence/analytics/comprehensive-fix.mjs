import { readFileSync, writeFileSync, readdirSync } from 'fs';

const files = readdirSync('src').filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const content = readFileSync(`src/${file}`, 'utf-8');
  let fixed = content;

  // Fix triple quotes
  fixed = fixed.replace(/msg:\s*'''([^']*)'''/g, "msg: '$1'");

  // Fix double single quotes
  fixed = fixed.replace(/msg:\s*''([^']*)''/g, "msg: '$1'");

  // Fix unquoted messages after msg:
  fixed = fixed.replace(/msg:\s*([^',}\s][^},]*?)(\s*[},])/g, (match, msg, delimiter) => {
    const cleanMsg = msg.trim();
    return `msg: '${cleanMsg}'${delimiter}`;
  });

  // Fix trailing commas before closing braces in logger objects
  fixed = fixed.replace(/,(\s*})/g, '$1');

  // Fix nested error instanceof checks
  fixed = fixed.replace(/error instanceof Error \? \(error instanceof Error \? error\.message : String\(error\)\) : String\(error\)/g,
    'error instanceof Error ? error.message : String(error)');

  if (content !== fixed) {
    writeFileSync(`src/${file}`, fixed);
    console.log(`Fixed: ${file}`);
  }
});

console.log('Fix complete!');