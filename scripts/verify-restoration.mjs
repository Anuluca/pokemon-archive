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
