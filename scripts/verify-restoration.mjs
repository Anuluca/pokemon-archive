/** 针对已出现的导航跳转、编码损坏及活动流程断链执行构建回归检查。 */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = new URL('../dist/tomy/', import.meta.url);
const pages = ['20130909/010392', '20130327/000006', '20140125/003180', '20130326/000030', '20130325/000078'];
for (const page of pages) {
  const text = await fs.readFile(new URL(`pages/kid.qq.com/a/${page}.htm`, base), 'utf8');
  assert(!text.includes('mi.MiniNav_110901V1'), `${page}: retired redirect dependency returned`);
  assert(text.includes('headnav.restored.css'), `${page}: restored navigation stylesheet missing`);
  assert(!text.includes('#TencentContent'), `${page}: retired mobile redirect returned`);
}
const css = await fs.readFile(new URL('assets/mat1.gtimg.com/kid/zt/2014/headnav.restored.css', base), 'utf8');
assert(!css.includes('\0') && css.includes('.menu{height:45px'), 'Navigation stylesheet was not decoded correctly');
const home = await fs.readFile(new URL('index.html', base), 'utf8');
assert(/href="[^\"]*events\/step1.php.html"[^>]*><img[^>]*ivent.jpg/.test(home), 'Home event entry is disconnected');
for (const [page, stage] of [['events/step1', 'quiz'], ['step1', 'information']]) {
  const text = await fs.readFile(new URL(`pages/www.tomy.cn/toy/pokemon/${page}.php.html`, base), 'utf8');
  assert(text.includes(`data-archive-event-stage="${stage}"`), `${stage}: event runtime missing`);
  assert(!/<form\b[^>]*(?:action|onsubmit)=/i.test(text), `${stage}: retired submission endpoint returned`);
}
console.log('Verified restored navigation and historical event flow.');

// 新增页面必须拥有真实原件；首页入口与活动锚点保持可追溯。
const additional = JSON.parse(await fs.readFile(new URL('../archives/tomy/additional-pages.json', import.meta.url), 'utf8'));
assert.equal(additional.pages.length, 3, 'Three user-supplied pages must be registered');
for (const page of additional.pages) {
  const destination = `pages/${page.localPath.slice(5)}`;
  assert(home.includes(`href="/tomy/${destination}${page.fragment ? `#${page.fragment}` : ''}"`), `${page.title}: footer link missing`);
  const published = await fs.readFile(new URL(destination, base), 'utf8');
  assert(published.includes('<title>'), `${page.title}: archived page missing`);
  if (page.fragment) assert(new RegExp(`(?:id|name)=["']${page.fragment}["']`).test(published), 'Activity anchor missing');
}
for (const file of [base, new URL('../dist/', import.meta.url)]) {
  const entry = await fs.readFile(new URL('index.html', file), 'utf8');
  assert(entry.includes('本站仅用于互联网失传媒体的保存与归档，不用于任何商业用途。'), 'Non-commercial archive statement missing');
  for (const link of ['https://github.com/Anuluca/pokemon-archive', 'https://anuluca.com/']) assert(entry.includes(`href="${link}"`), `Project footer link missing: ${link}`);
}
console.log('Verified three additional pages, footer navigation and project links.');

// 杰外页与 TOMY 独立发布；灯箱/响应式资源也在通用本地引用检查范围内。
const jiewaiBase = new URL('../dist/jiewai/', import.meta.url);
const jiewai = await fs.readFile(new URL('index.html', jiewaiBase), 'utf8');
assert(home.includes('href="/jiewai/">杰外宝可梦专题</a>'), 'Jiewai entry missing from TOMY footer');
assert(jiewai.includes('href="/tomy/"'), 'TOMY return link missing from Jiewai');
assert.equal((jiewai.match(/class="portfolio_entry_li"/g) || []).length, 6, 'Jiewai gallery entries lost');
assert(jiewai.includes('节目信息') && jiewai.includes('超级愿望'), 'Jiewai historical text missing');
assert(!/srcset=["'][^"']*http:\/\/jya\.cn\//.test(jiewai), 'Responsive candidate still depends on original host');
const {Script} = await import('node:vm');
async function checkJiewaiScripts(folder) {
  for (const entry of await fs.readdir(folder, {withFileTypes: true})) {
    const file = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, folder);
    if (entry.isDirectory()) {if (entry.name !== 'originals') await checkJiewaiScripts(file);}
    else if (entry.name.endsWith('.js')) new Script(await fs.readFile(file, 'utf8'), {filename: file.pathname});
    else if (entry.name.endsWith('.css')) assert(!/content\s*:\s*["']\/jiewai\/assets\//.test(await fs.readFile(file, 'utf8')), 'CSS content token was rewritten as a file path');
  }
}
await checkJiewaiScripts(jiewaiBase);
for (const match of jiewai.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (match[2].trim() && !/type=["']application\//.test(match[1])) new Script(match[2]);
}
console.log('Verified Jiewai collection, six gallery entries and executable JavaScript syntax.');
