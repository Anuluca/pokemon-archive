/** 验证构建结果中的本地页面、图片、脚本及 CSS 引用；不请求原站。 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
let checked = 0;
const failures = [];
async function visit(folder) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'originals') await visit(file); continue; }
    if (!/\.(?:html?|shtml|css)$/i.test(file)) continue;
    const relative = path.relative(dist, file).split(path.sep).join('/');
    const text = await fs.readFile(file, 'utf8');
    const refs = [...text.matchAll(/\b(?:href|src|background|poster|data-src|data-original)=(['"])([^'"<>]*)\1/gi)].map(m => m[2]);
    refs.push(...[...text.matchAll(/\burl\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)].map(m => m[1]));
    for (const ref of refs) {
      if (!ref || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(ref)) continue;
      let url;
      try { url = new URL(ref.replaceAll('&amp;', '&'), `https://archive.invalid/${relative}`); } catch { continue; }
      const filename = decodeURIComponent(url.pathname.slice(1));
      let target = path.join(dist, filename);
      if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
      checked++;
      try { await fs.access(target); }
      catch { failures.push({ page: relative, reference: ref }); }
    }
  }
}
await visit(dist);
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exitCode = 1; }
else console.log(`Verified ${checked} local references; no missing deployment files.`);
