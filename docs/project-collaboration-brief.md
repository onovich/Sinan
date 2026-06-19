# Sinan Engine 项目对外协作介绍

日期：2026-06-20
面向读者：相机控制库、输入控制库、资源加载库、UI 组件库、Web 3D 工具链、动画/Timeline 工具、编辑器基础设施项目的维护者或技术负责人

## 一句话概述

Sinan Engine 是一个 AI 原生、数据优先的 Web 3D 游戏引擎与编辑器。它用 Git 可追踪的 JSON、TypeScript schema、validator、registry、adapter 和测试来描述 runtime、renderer、physics、assets、input、UI、Director、Editor 等游戏语义，让人类开发者和 AI coding agent 都可以稳定地读写、运行、迁移和验证一个 3D 游戏/互动场景项目。

它不是 Unity、Godot、PlayCanvas Editor 或 Babylon Editor 的复刻，但它已经从独立的导演/演出系统升级为一个真正的游戏引擎项目。Sinan 更关注“AI 可操作的引擎语义 + 可验证数据协议 + 可替换 runtime/render/physics adapter + 项目专用编辑器”，适合中小型 Web 3D 互动叙事、轻玩法游戏、关卡原型、场景编排、镜头演出和 AI 辅助内容制作。

原先的 Sinan Scene Director 范围现在是 Sinan Engine 内置的 Director System：负责 Event、Condition、Action、Timeline、Camera Shot、动画调度和 cinematic flow。Director System 仍是核心差异点，但必须与 runtime、renderer、physics、assets、input、UI、editor 共同组成可运行闭环。

## 当前项目状态

Sinan 当前已经从文档/架构阶段推进到可运行的 Post-MVP 基线：

- 技术栈：Vite、React、TypeScript、Three.js、Zod、Vitest、Playwright。
- 运行时：Three.js 被限制在 `src/runtime/three/**`，游戏语义层保持 renderer-neutral。
- 数据源：`data/**/*.json` 是 assets、prefabs、levels、events、timelines、camera shots、palettes 等内容的 source of truth。
- 编辑器：已有 React 编辑器外壳、Viewport、Hierarchy、Inspector、Asset、Event、Timeline、Camera Shot 等面板。
- Demo：当前 Gate Demo 包含房间、开关、门、触发器、交互事件、开门 Timeline、Camera Shot、字幕、音频、保存/重载作者工作流。
- 数据安全：已有 Zod schema、引用校验、registry 覆盖校验、migration check、import boundary check、Playwright smoke。
- 视觉基础：Phase 16 已完成数据驱动 `Renderable.renderStyle`、palette-toon 风格、环境背景/雾/曝光/饱和度、selected/highlight 装饰和 low-end style profile。
- 定位升级：当前产品定位已经从 Scene Director 升级为 Sinan Engine；后续渲染、物理、输入、UI 等模块将按 first-party engine systems 规划。
- 下一阶段：Phase 17 计划推进 asset metadata、预算校验、资源报告、压缩资源加载策略和优化管线文档。

当前项目可以作为合作方的真实集成测试场：它不是空白 demo，也还没有大到所有接口都定型，因此适合共同探索 adapter、schema、runtime hooks 和编辑器嵌入方式。

## 核心架构

Sinan 的核心原则是数据和语义先行，runtime、渲染、物理、输入、UI 和编辑器通过清晰 adapter 与模块边界接入。

```txt
React Editor / HUD / Panels
  Hierarchy / Inspector / Timeline / Camera / Asset / Event
        |
        v
Editor Application Layer
  Commands / Undo / Redo / Selection / Save / Tools
        |
        v
Engine Semantic Layer
  World / Entity / Component / Render / Physics / Input / UI
  Event / Condition / Action / Timeline / CameraShot / Director
        |
        v
Engine Adapter Layer
  WebRuntime / RendererAdapter / PhysicsAdapter / AssetLoader / BrowserInput
        |
        v
Three.js / Rapier / Browser APIs
  WebGL/WebGPU / GLB loading / animation / picking / gizmo / audio / input
```

关键边界：

- `data/**/*.json` 是事实源，runtime cache、React component tree、Three.Scene、localStorage 都不是事实源。
- `src/schemas/**` 定义 JSON 数据格式，并提供 TypeScript 类型与运行时校验。
- `src/events/**` 通过 trigger、condition、action registry 执行游戏事件，不允许 `eval`、脚本字符串或未注册函数调用。
- `src/director/**` 负责 Timeline、Camera Shot、动画、属性轨道、字幕、音频等 Director System，但不直接依赖 Three.js。
- `src/runtime/WebRuntime.ts` 是渲染运行时接口；Three.js 当前只是一个实现。
- 后续 `src/physics/**`、`src/renderer/**`、`src/input/**`、`src/ui/**` 等引擎语义模块也应保持 adapter-neutral，不直接绑定 Three.js、Rapier 或 React 高频状态。
- `src/editor/**` 负责 React 慢状态、面板、命令式编辑、undo/redo、dirty state 和保存体验。
- 高频状态，如 per-frame transform、动画播放、timeline sampling、camera sampling、physics/AI，不能依赖 React setState 作为主循环。

## 现有数据协议

当前已落地的主要数据类型包括：

- `data/assets.manifest.json`：资源 id、类型、URL、可选 metadata。
- `data/prefabs/*.json`：可复用对象模板、默认 transform、组件集合、renderStyle。
- `data/levels/*.json`：关卡实体、prefab 引用、环境样式、事件、Timeline、Camera Shot。
- `data/events/*.json`：trigger、condition、action 编排。
- `data/timelines/*.json`：action、animation、camera、property、subtitle、sound、wait 等轨道。
- `data/cameraShots/*.json`：static、keyframed、follow、lookAt 类型运镜数据。
- `data/palettes/*.json`：风格化渲染 palette 与 tone。

这意味着外部库如果希望合作，最理想的接入方式不是要求 Sinan 把状态藏进某个 GUI 或私有序列化格式，而是共同定义可校验、可迁移、可 diff 的数据契约。

## 可合作方向

### 1. 相机控制库

Sinan 已经有 Camera Shot 数据和 `DirectorCameraSystem`，支持 keyframed、follow、lookAt 等镜头类型，并通过 `WebRuntime.setCameraPose` 下发 runtime pose。当前也有编辑器视口相机控制与 TransformControls 相关逻辑。

潜在合作点：

- 将外部相机库封装为 runtime-neutral camera adapter。
- 为编辑器视口提供更成熟的 orbit/pan/dolly/focus/frame selection 控制。
- 为导演系统提供更好的 camera blending、constraints、shake、rail、target tracking、collision avoidance。
- 把相机库的能力映射到 `cameraShots/*.json`，而不是把镜头真相源锁进外部库内部状态。
- 提供相机调试可视化、路径预览、关键帧曲线和拍摄机位工具。

理想 POC：

- 保持现有 `cam_gate_reveal` 数据不变或只做 schema 扩展。
- 用合作相机库驱动 Gate Demo 的 camera shot 播放。
- 添加一个编辑器视口控制替换/增强实验。
- 通过 Vitest 验证 pose sampling，通过 Playwright 验证 viewport 非空、镜头变化可见。

### 2. 输入控制库

Sinan 当前已经有编辑器选择、viewport picking、gizmo 操作和基础交互路径。更完整的 gameplay input、rebind、gamepad、mobile touch、editor/game mode input routing 仍有合作空间。

潜在合作点：

- 设计 renderer-neutral 的 `InputAction` / `InputState` 层。
- 支持 keyboard、mouse、pointer、touch、gamepad 的统一绑定。
- 区分 editor input、viewport tool input、runtime gameplay input、modal/panel input。
- 提供可序列化输入映射数据，未来可进入 `data/inputMaps/*.json` 或项目配置。
- 处理 focus、快捷键冲突、组合键、长按、轴输入、输入录制和回放。

接入要求：

- 输入状态不要成为 React UI state 的高频主存储。
- 输入库不应直接依赖 Three.js 对象或 Sinan 内部 editor store。
- 需要能被单元测试或 replay 测试驱动，便于 AI agent 自动验证行为。

理想 POC：

- 为 Gate Demo 定义一个 `interact` action，默认绑定 `E` 或鼠标点击。
- 让 editor viewport 与 runtime gameplay input 明确分层，避免快捷键互相污染。
- 添加一组输入映射测试和一次浏览器 smoke。

### 3. 资源加载库与资产管线

Sinan 当前资源通过 `assets.manifest.json` 声明，Three runtime 加载 GLB/audio，并在缺失或失败时使用确定性 placeholder/fallback。Phase 17 正准备做 asset metadata、预算校验、资源报告和压缩资源加载策略。

潜在合作点：

- GLB/glTF、Draco、meshopt、KTX2、音频、贴图等资源加载策略。
- manifest metadata 设计：分类、预算、压缩状态、LOD marker、instancing hint、known clips、source notes。
- 加载进度、错误报告、fallback 策略和可观测性。
- 资源体积报告、预算阈值、CI 校验和优化建议。
- 与 Blender/export pipeline、CDN/public-root、本地开发资源生成脚本协作。
- 缓存、预加载、按场景分包、低端模式资源策略。

接入要求：

- 资源事实源仍是 `data/assets.manifest.json` 和 schema。
- Three.js decoder/transcoder 细节应留在 `src/runtime/three/**` 或 runtime adapter 内。
- 资源库应能暴露可测试的错误状态，不依赖隐式全局配置。
- 不能要求生产压缩资产在项目还没准备好时成为硬依赖；需要 deterministic fallback。

理想 POC：

- 为当前 5 个 demo assets 补充 typed metadata。
- 增加 `npm run report-assets` 或等价报告。
- 用合作资源加载库接管模型加载路径，但保留 `WebRuntime.loadModel(assetId, url)` 外部契约。
- 添加压缩资源未配置时的安全 fallback 测试。

### 4. UI 组件库

Sinan 的编辑器是 React 应用，面板包括 Hierarchy、Inspector、Asset、Event、Timeline、Camera Shot、Debug 等。它需要的是面向工具软件的密集、可扫描、可长期使用的 UI，而不是营销页或展示型组件。

潜在合作点：

- Inspector 表单、字段编辑器、JSON/schema 驱动表单。
- Timeline 轨道、关键帧编辑、拖拽排序、scrub、preview-safe action 执行。
- 面板布局、split pane、dock、tabs、toolbar、context menu、command palette。
- 状态提示、dirty state、save/reload、validation errors、schema path 定位。
- 可访问性、键盘操作、focus management、主题系统。
- 与现有 editor command、undo/redo、dirty state 整合。

接入要求：

- UI 库不应接管游戏运行时状态。
- 编辑器 mutation 必须走 command 对象，以保留 undo/redo、dirty state、保存和测试能力。
- 组件需要适配工具型界面：信息密度高、尺寸稳定、响应式不重排关键操作。
- 如果提供表单系统，最好能与 Zod/schema path、数据验证错误、JSON patch 或 command model 对接。

理想 POC：

- 选择一个低风险面板，例如 AssetPanel 或 CameraShotPanel 的局部控件替换。
- 保持现有数据保存格式不变。
- 验证窄屏布局、键盘 focus、保存状态和 smoke test。

### 5. 动画、Timeline 与 Sequencer 工具

Sinan 已有 timeline JSON 和 track player，支持 action、animation、camera、property、subtitle、sound、wait。后续需要更成熟的 keyframe authoring、curve editor、track groups、clip trimming、preview safety 和非破坏性 scrub。

潜在合作点：

- Timeline UI/交互库。
- 曲线编辑、easing、keyframe tangents、clip 操作。
- 与 GLB animation clip metadata 联动。
- Preview-safe side effect 分类和 scrub 策略。
- 从外部工具导入/导出 timeline JSON。

接入原则仍然是：外部工具可以帮助 authoring，但 `data/timelines/*.json` 不能被替换成不可 diff 的隐藏状态。

### 6. 物理、角色控制与碰撞库

当前 MVP 以 trigger zone、AABB、picking 和简单交互为主。Rapier 等物理层被定义为可选后续方向。

潜在合作点：

- trigger/collider authoring。
- scene queries、raycast、character controller。
- debug render 与 editor selection 联动。
- 物理数据 schema、runtime adapter 和 deterministic tests。

接入要求是物理对象不能泄漏到 entity JSON 或 director/event 层；高频物理状态也不能走 React 主状态。

## Sinan 能给合作方提供什么

- 一个真实但仍可控的 Web 3D 编辑器场景，可作为外部库集成样例。
- 明确的层级边界，便于验证外部库是否能以 adapter 方式接入。
- Git-friendly 数据协议，有利于展示“AI 可读写、可迁移、可验证”的工作流。
- 自动化验证环境：unit tests、schema validation、boundary check、data validation、Playwright smoke。
- 场景导演类 use case：不是单纯模型展示，而是事件、条件、动作、镜头、动画、音效、字幕、UI 编辑共同工作。
- 后续路线清晰：资源预算/压缩、LOD/instancing、球形世界、Showcase gameplay、多人协作等阶段都可预留合作窗口。

## 对合作方的期望

为了判断合作空间，建议合作方提供以下信息：

- 包的运行环境：browser、React、Three.js、vanilla JS、WebGPU/WebGL、Node 工具链等。
- 状态模型：是否有可序列化配置，是否依赖不可导出的内部 GUI 状态。
- 接口边界：能否通过 adapter 接入，是否需要侵入宿主项目架构。
- 依赖与体积：主要 dependencies、bundle 影响、是否支持按需加载。
- TypeScript 支持：类型完整度、泛型/事件模型、错误类型。
- 测试能力：是否能在 unit/browser smoke 中稳定验证。
- 许可与分发：开源协议、商业授权、npm 包或源码集成方式。
- Roadmap：是否愿意配合 schema、adapter、demo 和文档层面的联合设计。

## 推荐合作方式

可以从小到大分三层推进：

1. 评估层：共同审查 Sinan 的数据协议和合作方 API，确认是否适合 adapter 接入。
2. POC 层：围绕 Gate Demo 做一个窄集成，只替换或增强一个能力点，例如 editor camera、asset loader、input map 或一个 UI panel。
3. 产品层：沉淀稳定 schema、adapter、测试、文档和示例，把合作能力纳入 Sinan 后续阶段路线。

推荐优先级：

- 资源加载库：与 Phase 17 高度契合，短期最容易形成可验证成果。
- 相机控制库：与 Sinan Director System 和 Camera System 的核心差异化能力相关，适合做高展示价值 demo。
- UI 组件库：能直接改善编辑器生产力，但需要谨慎保护 command/save/undo 数据边界。
- 输入控制库：对后续 gameplay 和 editor 工具都重要，适合在基础规则定清后进入。

## 当前运行与验证

本地运行：

```powershell
npm ci
npm run dev -- --port 5174 --strictPort
```

常用验证：

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

项目内推荐使用配置好的 workflow wrapper：

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

## 适合带去沟通的问题

- 你们的库更适合成为 Sinan 的 runtime adapter、editor tool、schema extension，还是独立 authoring 辅助？
- 你们是否支持把关键状态导出为稳定 JSON，而不是仅保存在 GUI 或运行时对象里？
- 如果 Sinan 保持 Three.js 仅在 runtime adapter 内部，你们的库是否仍能接入？
- 你们是否接受从一个 Gate Demo POC 开始，用自动化测试定义验收边界？
- 你们希望 Sinan 提供怎样的最小宿主接口，才能让集成成本最低？

## 总结

Sinan Engine 的合作价值不在于“再造一个大而全的 Unity/Godot”，而在于提供一个 AI 友好、数据可验证、边界清晰的 Web 3D 游戏引擎基础设施。它可以成为相机、输入、资源、UI、动画、物理、渲染等外部库的真实宿主项目，也可以反过来帮助这些库验证自己是否适合进入 AI 辅助开发、Git-first authoring 和 Web 3D 互动叙事/轻玩法游戏工作流。
