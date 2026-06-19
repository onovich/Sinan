# Sinan Scene Director

Sinan Scene Director is a data-first Web 3D scene direction editor built with Vite, React, TypeScript, Three.js, Zod, Vitest, and Playwright.<br/>**Sinan Scene Director 是一个数据优先的 Web 3D 场景导演编辑器，使用 Vite、React、TypeScript、Three.js、Zod、Vitest 和 Playwright 构建。**

The project is intentionally not a Unity clone; game semantics live in JSON, schemas, validators, registries, and tests so humans and AI agents can edit the scene through Git-friendly files.<br/>**这个项目不是 Unity 克隆；游戏语义保存在 JSON、schema、validator、registry 和测试里，方便人和 AI agent 通过 Git 友好的文件协作编辑场景。**

## Current Status

The current post-MVP route has completed the asset-backed runtime, demo visual pass, runtime effects, editor UI/UX pass, authoring data safety, and Phase 13 hardening work.<br/>**当前 Post-MVP 路线已经完成真实资产 runtime、demo 视觉整理、runtime effects、编辑器 UI/UX、作者工作流数据安全，以及 Phase 13 的测试/性能/边界加固。**

The editor opens a demo room with a switch, gate, trigger helper, timeline, camera shot, subtitle/audio feedback, and save/reload authoring workflows.<br/>**编辑器会打开一个 demo 房间，包含开关、门、触发器辅助框、timeline、camera shot、字幕/音频反馈，以及保存/重载的作者工作流。**

## Quick Start

Install dependencies from a clean checkout.<br/>**在干净 checkout 中安装依赖。**

```powershell
npm ci
```

Start the local editor dev server, then open `http://127.0.0.1:5174/`.<br/>**启动本地编辑器开发服务器，然后打开 `http://127.0.0.1:5174/`。**

```powershell
npm run dev -- --port 5174 --strictPort
```

Regenerate the lightweight development GLB/audio assets if the public assets are missing or intentionally refreshed.<br/>**如果 public 资产缺失，或者需要主动刷新轻量开发用 GLB/音频资产，可以重新生成它们。**

```powershell
npm run generate:dev-assets
```

## Validation

Run the full configured validation through the Codex ops wrapper when available.<br/>**如果 Codex ops wrapper 可用，优先用项目配置的完整验证入口。**

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

Equivalent direct commands are listed below for ordinary local development.<br/>**普通本地开发也可以直接运行下面这些等价命令。**

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run build
npm run test
npm run check-boundaries
npm run validate-data
npm run migrate-data -- --check
npm run test:smoke
```

## Project Map

- `data/**/*.json` is the source of truth for assets, prefabs, levels, events, timelines, and camera shots.<br/>**`data/**/*.json` 是 assets、prefabs、levels、events、timelines 和 camera shots 的事实源。**
- `src/runtime/three/**` owns Three.js, GLB loading, runtime object resources, picking, animation, and transform controls.<br/>**`src/runtime/three/**` 负责 Three.js、GLB 加载、runtime object 资源、拾取、动画和 transform controls。**
- `src/schemas/**`, `src/data/**`, `src/events/**`, `src/director/**`, and `src/world/**` stay renderer-neutral.<br/>**`src/schemas/**`、`src/data/**`、`src/events/**`、`src/director/**` 和 `src/world/**` 必须保持 renderer-neutral。**
- `src/editor/**` owns React editor state, panels, command-backed mutations, dirty state, and save UX.<br/>**`src/editor/**` 负责 React 编辑器状态、面板、命令驱动的数据修改、dirty state 和保存体验。**
- `docs/developer-guide.md` is the compact guide for assets, actions, conditions, timelines, camera shots, and release validation.<br/>**`docs/developer-guide.md` 是资产、actions、conditions、timelines、camera shots 和 release 验证的精简开发指南。**

## Core Rules

Every JSON format needs a Zod schema, validation, and stable ids without spaces.<br/>**每一种 JSON 格式都需要 Zod schema、验证逻辑，以及不含空格的稳定 id。**

Actions and conditions must go through schemas plus registries; do not add dynamic evaluation, raw script strings, or unregistered function dispatch.<br/>**Actions 和 conditions 必须走 schema 与 registry；不要加入动态执行、原始脚本字符串或未注册函数分发。**

Timeline scrub must not execute destructive or runtime-only side effects, and editor mutations must go through command objects for undo, redo, save, and tests.<br/>**Timeline scrub 不得执行破坏性或 runtime-only 副作用；编辑器数据修改必须通过 command object，以支持 undo、redo、save 和测试。**

## More Docs

- `docs/developer-guide.md` - setup, validation, assets, actions, conditions, timelines, and camera shots.<br/>**`docs/developer-guide.md` - setup、验证、资产、actions、conditions、timelines 和 camera shots。**
- `docs/post-mvp-development-plan.md` - Phase 8 through Phase 14 roadmap and acceptance gates.<br/>**`docs/post-mvp-development-plan.md` - Phase 8 到 Phase 14 的路线和验收 gate。**
- `docs/post-mvp-execution-workflow.md` - execution workflow, validation rhythm, and boundary checks.<br/>**`docs/post-mvp-execution-workflow.md` - 执行 workflow、验证节奏和边界检查。**
- `docs/Sinan_Scene_Director_研发方案与架构指南.md` - original product and architecture guide.<br/>**`docs/Sinan_Scene_Director_研发方案与架构指南.md` - 原始产品与架构指南。**
