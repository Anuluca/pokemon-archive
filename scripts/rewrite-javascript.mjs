/**
 * 只改写 JavaScript 抽象语法树中的静态字符串地址。
 * 不能用 HTML 属性或引号正则处理压缩脚本：正则表达式中的引号和转义会被误切分。
 */
import {parse} from 'acorn';
const staticPath = /^(?:(?:https?:)?\/\/|\.{1,2}\/|\/)|\.(?:png|jpe?g|gif|svg|ico|css|js|html?|shtml|swf|woff2?|ttf|eot|cur)(?:[?#]|$)/i;
export function rewriteJavaScript(source, rewrite) {
  if (!source.trim()) return source;
  const tree = parse(source, {ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true});
  const edits = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Literal' && typeof node.value === 'string') {
      let replacement = staticPath.test(node.value) ? rewrite(node.value) : node.value;
      // 旧站会用完整 HTML 字符串创建 Flash/脚本元素；在字符串值内部改写，再由 JSON 安全转义。
      replacement = replacement.replace(/\b(src|href|data|value)=(['"])([^'"<>]*)\2/gi,
        (_, attribute, quote, value) => `${attribute}=${quote}${rewrite(value)}${quote}`);
      if (replacement.includes('url(')) replacement = replacement.replace(/\burl\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi,
        (_, quote, value) => `url(${quote}${rewrite(value)}${quote})`);
      if (replacement !== node.value) edits.push({start: node.start, end: node.end, text: JSON.stringify(replacement)});
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object' && typeof value.type === 'string') visit(value);
    }
  }
  visit(tree);
  // 从末尾替换，保证所有节点位置仍指向原始字符串。
  for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return source;
}
