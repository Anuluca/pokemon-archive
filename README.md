# 宝可梦网站归档

公开访问：https://pokemon-archive.anuluca.com/

| 集合 | 访问路径 | 当前内容 |
| --- | --- | --- |
| TOMY | `/tomy/` | 腾讯儿童 × 多美宝可梦专区 |

## 仓库结构

```text
archives/
  tomy/              # 已保存的离线归档、原始下载文件、资源清单
collections.json     # 集合注册表；新增归档只需添加配置
scripts/
  build.mjs          # 生成独立的集合路径，改写本地资源链接
  verify.mjs         # 检查部署后的本地引用
netlify.toml         # Netlify 构建和发布配置
dist/                # 构建产物，不提交 Git
```

## 构建与部署

需要 Node.js 22 或更新版本。无第三方构建依赖。

```sh
npm run build
npm run verify
```

Netlify 连接本仓库的 `main` 分支，构建命令和发布目录由 `netlify.toml` 提供。

- 构建命令：`npm run build && npm run verify`
- 发布目录：`dist`
- 自定义域名：`pokemon-archive.anuluca.com`

## 以后新增杰外归档

1. 将完成的离线归档放进 `archives/jiewai/`。
2. 在 `collections.json` 加入一个集合，填写原始首页的仓库相对路径，例如：

```json
{
  "slug": "jiewai",
  "title": "杰外宝可梦网站归档",
  "source": "archives/jiewai",
  "homepage": "site/原域名/index.html",
  "capturedAt": "实际归档日期",
  "referenceSnapshot": "历史快照日期"
}
```

3. 运行 `npm test`，检查本地资源引用。向 `main` 推送后，由 Netlify 自动发布。

构建脚本将集合首页发布到 `/jiewai/`，同目录的其他 HTML 页面保留文件名；其他页面、资源和原件分别隔离保存，不影响 `/tomy/`。

## 归档范围与限制

TOMY 集合保存 16 个原始 HTML 页面和 311 个图片文件。主站五个页面直接引用的图片已全部取回；部分关联文章分页、壁纸原图和游戏资源未取回。准确结果以 `archives/tomy/manifest.json` 及 `report.html` 为准。

`originals/` 保留原始下载字节，`site/` 是离线链接改写后的副本。构建只改变发布副本，不改动原件。网站中的 `deployment-map.json` 记录原归档路径与发布路径的对应关系。

Flash 播放器原文件可保留，但普通现代浏览器不能原生运行 Flash。远程动画播放、评论和投稿等在线服务不属于静态归档可恢复的功能。

原站文字、图像、品牌与动画素材的权利归各自权利人所有。本仓库不对这些第三方归档内容授予新的许可。
