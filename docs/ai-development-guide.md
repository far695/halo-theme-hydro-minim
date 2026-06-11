# Hydro-Minim AI Development Guide

本文件是 `halo-theme-hydro-minim` 的本地深度开发指南。进入本主题时先读根目录 `AGENTS.md`，再读本文。

## 必读顺序

1. `AGENTS.md`：项目身份、编辑边界、视觉不变量、关键交互。
2. 本文件：当前主题目录、源码地图、常见开发路线。
3. `CONTEXT.md`：领域语言、当前决策和禁止破坏的产品语义。
4. 相关 ADR：触碰标签云、移动阅读控件、主题设置、图片加载等已决策区域时必须先读。

## 当前主题边界

- 只编辑 `src/`、`public/`、`theme.yaml`、`settings.yaml`、配置和文档源文件。
- 不手动编辑 `templates/` 和 `dist/`；它们分别由 `pnpm run build-only`、`pnpm run build` 生成。
- 运行时不引入 React、Radix、shadcn；现有交互由 Thymeleaf + Vite TypeScript + CSS 完成。
- 保持 Hydro-Minim 的灰白背景、Space Mono、黑色细边线、轻颗粒和克制极简氛围。

## 源码地图

| 路径                         | 责任                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `src/*.html`                 | Halo 页面模板源文件，覆盖首页、文章、页面、分类、标签、归档、作者、扩展页面和错误页 |
| `src/modules/`               | Header、Hero、文章卡片、列表 Hero、分页、Footer 等可复用片段                        |
| `src/partials/`              | 基础布局和 head 资源入口                                                            |
| `src/assets/main.ts`         | Lenis、GSAP、导航切换、Hero motion、主题切换、页面交互                              |
| `src/assets/hydro-notice.ts` | 全局胶囊提示框运行时服务，暴露 `window.HydroNotice` 给主题和插件扩展                |
| `src/assets/styles/main.css` | 主视觉系统、响应式、深浅色变量、动画样式                                            |
| `public/assets/`             | 静态图片、品牌资源和无需经过打包的主题资源                                          |
| `theme.yaml`                 | Halo 主题元信息与自定义模板声明                                                     |
| `settings.yaml`              | Halo 后台设置表单                                                                   |

## 主题内部开发索引

开发时优先从本主题已有实现往外扩展，别一上来就开新坑。常用入口如下：

| 目标     | 首选入口                                                                  |
| -------- | ------------------------------------------------------------------------- |
| 页面结构 | `src/*.html`、`src/modules/`、`src/partials/layout.html`                  |
| 数据接入 | 当前页面模板中的 Thymeleaf 表达式、Finder 调用和空值兜底                  |
| 全局交互 | `src/assets/main.ts`、`src/assets/hydro-notice.ts`                        |
| 视觉系统 | `src/assets/styles/main.css`、`PRODUCT.md`、`docs/theme-features.md`      |
| 设置项   | `settings.yaml`、`docs/adr/0005-operator-minded-theme-setting-domains.md` |
| 领域决策 | `CONTEXT.md`、`docs/adr/`                                                 |

## 常见开发路线

### 修改模板页面

1. 改 `src/*.html` 或 `src/modules/*.html`。
2. 检查 Thymeleaf 表达式是否有空值兜底。
3. 运行 `pnpm run check`。
4. 运行 `pnpm run build`。
5. 如果是路由或 Halo 运行时问题，检查生成后的 `templates/*.html` 是否符合预期。

### 修改交互

1. 优先改 `src/assets/main.ts`，不要在模板里堆大段 inline JS。
2. 保持 Header 胶囊、主题光幕、Hero motion、滚动倾斜这些状态机彼此独立。
3. 任何滚动 transform 必须在停止后复位并清理，避免点击命中区域错位。
4. 运行 `pnpm run check` 和 `pnpm run build`，视觉/交互改动还要做桌面端和移动端浏览器检查。

### 全局提示框扩展

主题内置 `window.HydroNotice`，由 `src/assets/hydro-notice.ts` 初始化，样式写在 `src/assets/styles/main.css` 的 `.hydro-notice-*` 段。它是主题和插件共享的前台反馈接口，不要让插件直接拼接主题内部 DOM。

公开接口保持稳定：

```ts
window.HydroNotice?.show({
  id: "plugin-action-status",
  title: "Plugin",
  message: "操作完成",
  variant: "success", // info | success | warning | error
  duration: 4200,
  dismissible: true,
});
window.HydroNotice?.success("保存成功");
window.HydroNotice?.clear("plugin-action-status");
```

扩展约定：

1. 业务状态类提示必须传稳定 `id`，重复调用同一 `id` 会替换旧提示，避免消息堆叠。
2. `duration: 0` 只用于需要用户明确关闭的状态，例如长任务失败、权限阻断、插件配置缺失。
3. 提示文案保持短句；胶囊 UI 会单行省略，长说明应该放进页面正文或弹窗。
4. 插件脚本可能早于主题主脚本执行，调用前必须判空 `window.HydroNotice?.success(...)`，或放到 `DOMContentLoaded` 后执行。
5. 样式只能使用 Hydro token，例如 `--hydro-ink-rgb`、`--hydro-paper-rgb`、`--hydro-coral-rgb`，不要给不同插件另开一套彩色 toast 体系。

### 新增页面或插件适配

1. 先查 `theme.yaml` 是否需要声明 custom template。
2. 优先复用 `src/partials/layout.html`、`src/modules/header.html`、`src/modules/footer.html`。
3. 数据接入先查本主题已有页面模板、`CONTEXT.md` 和相关 ADR，再按 Halo Finder/API 约束补齐。
4. 插件页优先复用本主题的空状态、安装提示、渐进图片和全局提示框模式。
5. 不把插件适配写成另一套视觉系统。

### 插件扩展页作为独立页面模板

`bangumis.html`、`docs.html`、`equipments.html`、`friends.html`、`moments.html`、`photos.html`、`steam.html`
同时服务插件原生路由和 Halo 独立页面自定义模板。后台使用方式：

1. 在 Console 新建独立页面。
2. 在页面模板中选择对应的 `Hydro ...` 模板。
3. 自定义页面 slug，建议不要直接使用 `moments`、`photos`、`bangumis`、`docs` 等插件原生路径，避免安装插件后出现路由优先级冲突。
4. 修改 `theme.yaml` 模板声明后，需要在主题管理中重新加载主题配置。

这类模板必须先判断插件是否可用，再读取插件 Finder 或路由注入变量；未安装插件时显示安装提示，不要直接访问 `moments.items`、`photos.items`、`groups`、`projects` 等可能不存在的变量。

### 非首页内容页 UI 规范

非首页内容页统一走 `Hydro Content Surface` 视觉系统，覆盖范围包括：

- 自定义模板：`page_about.html`、`bangumis.html`、`docs.html`、`equipments.html`、`friends.html`、`moments.html`、`photos.html`、`steam.html`。
- 分类与内容索引：`categories.html`、`category.html`、`tags.html`、`tag.html`、`archives.html`、`search.html`。
- 插件相邻页面：`links.html`、`moment.html`、`doc.html`、`doc-catalog.html`。

设计约束：

1. 首页、文章详情、普通独立页、登录/注册/错误页不属于这一组，除非任务明确要求，不要顺手改。
2. 共享基座写在 `src/assets/styles/main.css` 的 `Hydro Content Surface` 段，优先使用 `--hydro-surface`、`--hydro-line`、`--hydro-radius-*`、`--hydro-content-ease` 等 token。
3. 页面必须统一 Hydro 气质，但布局不能全变成同一种卡片网格：分类是目录行，标签是 chip 云，归档是年份时间轴，搜索是结果索引，友链是连接墙，Moment 是时间线，Docsme 是文档壳。
4. 不新增后台设置项、不改 Finder/API 语义；模板只补必要 wrapper、状态容器和可访问结构。
5. 动效只使用 `transform`、`opacity` 和必要的 `filter`，继续兼容 `prefers-reduced-motion`、深浅色切换、lightbox、Steam 动态渲染、Moment 点赞/评论和友链提交弹窗。

## 交付检查

至少执行：

```bash
pnpm run check
pnpm run build
```

如果改动涉及视觉、交互、页面路由或 Halo 数据表达式，还需要：

- 对比 `src/` 和生成后的 `templates/`。
- 在 Halo 实例检查首页桌面端、移动端、文章详情页、分类/标签/归档页。
- 对新增扩展页面检查未安装插件、空数据、图片缺失、深浅色切换、PJAX/返回导航等状态。
