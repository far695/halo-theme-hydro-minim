# 氢·简 / Hydro-Minim

Hydro-Minim 是“氢”系列的首款 Halo 主题，项目标识为 `halo-theme-hydro-minim`。主题由原 React + TypeScript + Vite 原型改造而来，但运行时采用 Halo 原生 Thymeleaf 模板 + Vite TypeScript 交互，不依赖 React。

主题已支持浅色、深色和跟随系统三种默认配色，并提供访客侧深浅色切换按钮。

## 快速开始

```bash
pnpm install
pnpm dev
```

开发源文件在 `src/`，`templates/` 是 Vite/Halo 插件生成的产物，不要手动编辑。

## 构建与校验

```bash
pnpm run check
pnpm run build
```

`pnpm run build` 会生成可安装主题包：

```text
dist/halo-theme-hydro-minim-1.0.0.zip
```

## 快捷操作按钮

主题设置中的“全局组件 / 快捷项”支持两层配置：

- `全局默认快捷项`：所有页面都没有命中专属规则时使用。
- `页面快捷配置`：按永久链接或模板 ID 命中后覆盖全局默认配置，永久链接规则优先于模板 ID 规则，`所有页面` 规则作为兜底；永久链接支持 `/about`、`/about/` 或完整 URL，并兼容当前请求路径；如果命中的页面配置是空的，会回退到全局默认快捷项。

每个快捷项支持三类动作：

- `跳转链接`：保持原有链接跳转能力，可配置是否新标签打开。
- `主题内置动作`：支持打开搜索、切换深浅色、返回顶部、复制当前链接、打印页面、打开移动菜单、滚动到评论区。
- `自定义函数`：在“高级 / 自定义 JavaScript”中注册 `window.HydroMinimActions`，快捷项填写函数名和 JSON 参数。

页面规则示例：

```text
模板 ID: page_about
永久链接: /about
模板 ID: docs
永久链接: /docs
```

自定义函数示例：

```js
window.HydroMinimActions = {
  ...(window.HydroMinimActions || {}),
  openSponsorModal({ payload }) {
    const modal = document.querySelector(`[data-modal="${payload.modal}"]`);
    modal?.classList.add("is-open");
  },
};
```

## 目录说明

- `src/*.html`: Halo 页面模板源文件，包括首页、文章、页面、分类、标签、归档、作者和错误页。
- `src/modules/`: 首页与列表页复用模块，例如 Header、Hero、文章卡片、分页、Footer。
- `src/partials/`: 基础 HTML 布局和 head 资源入口。
- `src/assets/main.ts`: Lenis、GSAP、导航切换、Hero 鼠标动效等交互逻辑。
- `src/assets/styles/main.css`: Hydro-Minim 的主要视觉系统和响应式样式。
- `public/assets/images/`: 默认 Hero 和文章封面图，构建后复制到 `templates/assets/images/`。
- `theme.yaml`: Halo 主题元信息。
- `settings.yaml`: Halo 主题设置表单。

## 给后续 AI Agent

继续开发前请先阅读：

- [AGENTS.md](./AGENTS.md)：本主题的 Agent 入口，项目身份、约束、视觉不变量和关键交互。
- [docs/ai-development-guide.md](./docs/ai-development-guide.md)：本主题的深度开发指南，当前源码地图、参考主题索引、交互/模板开发路线和常见陷阱。
- [../AI-THEME-DEV-GUIDE.md](../AI-THEME-DEV-GUIDE.md)：工作区级 Halo 主题开发通用指南，整合所有参考主题的模式、Thymeleaf 规范、Finder API、Annotation Setting、前端选型和反模式速查。
