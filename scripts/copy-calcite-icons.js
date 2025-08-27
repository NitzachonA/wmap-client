const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', 'node_modules', '@esri', 'calcite-ui-icons', 'js'),
  path.join(__dirname, '..', 'node_modules', '@esri', 'calcite-components', 'dist', 'calcite', 'assets', 'icon'),
  path.join(__dirname, '..', 'node_modules', '@arcgis', 'core', 'assets', 'components', 'assets', 'icon')
];

const destDir = path.join(__dirname, '..', 'src', 'assets', 'arcgis', 'components', 'assets', 'icon');
fs.mkdirSync(destDir, { recursive: true });

let copied = 0;
for (const t of targets) {
  if (!fs.existsSync(t)) continue;
  const files = fs.readdirSync(t).filter(f => f.toLowerCase().endsWith('.json'));
  for (const f of files) {
    try {
      const src = path.join(t, f);
      const dst = path.join(destDir, f);
      fs.copyFileSync(src, dst);
      copied++;
    } catch (err) {
      // ignore copy errors for individual files
    }
  }
}
console.log(`Copied ${copied} calcite icon files to ${destDir}`);
process.exit(0);
