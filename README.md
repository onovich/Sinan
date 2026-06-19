# Sinan Engine

Sinan Engine is an AI-native, data-first Web 3D game engine and editor built with Vite, React, TypeScript, Three.js, Zod, Vitest, and Playwright.<br/>**Sinan Engine 是一个 AI 原生、数据优先的 Web 3D 游戏引擎与编辑器，使用 Vite、React、TypeScript、Three.js、Zod、Vitest 和 Playwright 构建。**

The project is intentionally not a Unity or Godot clone. Its engine semantics live in JSON, schemas, validators, registries, adapters, and tests so humans and AI agents can edit, validate, migrate, and run game projects through Git-friendly files.<br/>**这个项目不是 Unity 或 Godot 克隆。它的引擎语义保存在 JSON、schema、validator、registry、adapter 和测试里，方便人和 AI agent 通过 Git 友好的文件协作编辑、验证、迁移和运行游戏项目。**

The original Scene Director scope is now treated as a first-party Director System inside the engine: events, conditions, actions, timelines, camera shots, animation cues, and cinematic flow must run together with runtime, renderer, physics, assets, input, UI, and editor systems.<br/>**原先的 Scene Director 范围现在升级为引擎内置的 Director System：events、conditions、actions、timelines、camera shots、animation cues 和 cinematic flow 必须与 runtime、renderer、physics、assets、input、UI、editor 系统共同组成可运行闭环。**

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

- `data/**/*.json` is the source of truth for assets, prefabs, levels, events, timelines, and camera shots.<br/><strong><code>data/**/*.json</code> 是 assets、prefabs、levels、events、timelines 和 camera shots 的事实源。</strong>
- `src/runtime/three/**` owns Three.js, GLB loading, runtime object resources, picking, animation, and transform controls.<br/><strong><code>src/runtime/three/**</code> 负责 Three.js、GLB 加载、runtime object 资源、拾取、动画和 transform controls。</strong>
- `src/schemas/**`, `src/data/**`, `src/events/**`, and `src/director/**` stay renderer-neutral; new engine modules such as physics, renderer, input, and UI should follow the same adapter boundary.<br/><strong><code>src/schemas/**</code>、<code>src/data/**</code>、<code>src/events/**</code> 和 <code>src/director/**</code> 必须保持 renderer-neutral；后续新增的 physics、renderer、input、UI 等引擎模块也应遵守同样的 adapter 边界。</strong>
- `src/editor/**` owns React editor state, panels, command-backed mutations, dirty state, and save UX.<br/><strong><code>src/editor/**</code> 负责 React 编辑器状态、面板、命令驱动的数据修改、dirty state 和保存体验。</strong>
- `docs/developer-guide.md` is the compact guide for assets, actions, conditions, timelines, camera shots, and release validation.<br/>**`docs/developer-guide.md` 是资产、actions、conditions、timelines、camera shots 和 release 验证的精简开发指南。**

## Core Rules

Every JSON format needs a Zod schema, validation, and stable ids without spaces.<br/>**每一种 JSON 格式都需要 Zod schema、验证逻辑，以及不含空格的稳定 id。**

Actions and conditions must go through schemas plus registries; do not add dynamic evaluation, raw script strings, or unregistered function dispatch.<br/>**Actions 和 conditions 必须走 schema 与 registry；不要加入动态执行、原始脚本字符串或未注册函数分发。**

Timeline scrub must not execute destructive or runtime-only side effects, and editor mutations must go through command objects for undo, redo, save, and tests.<br/>**Timeline scrub 不得执行破坏性或 runtime-only 副作用；编辑器数据修改必须通过 command object，以支持 undo、redo、save 和测试。**

## More Docs

- `docs/developer-guide.md` - setup, validation, assets, actions, conditions, timelines, and camera shots.<br/>**`docs/developer-guide.md` - setup、验证、资产、actions、conditions、timelines 和 camera shots。**
- `docs/post-mvp-development-plan.md` - Phase 8 through Phase 14 roadmap and acceptance gates.<br/>**`docs/post-mvp-development-plan.md` - Phase 8 到 Phase 14 的路线和验收 gate。**
- `docs/post-mvp-execution-workflow.md` - execution workflow, validation rhythm, and boundary checks.<br/>**`docs/post-mvp-execution-workflow.md` - 执行 workflow、验证节奏和边界检查。**
- `docs/Sinan_Scene_Director_研发方案与架构指南.md` - primary product and architecture guide, now updated for the Sinan Engine positioning.<br/>**`docs/Sinan_Scene_Director_研发方案与架构指南.md` - 主要产品与架构指南，已更新为 Sinan Engine 定位。**
