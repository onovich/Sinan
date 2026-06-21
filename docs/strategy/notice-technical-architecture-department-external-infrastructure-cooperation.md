# 给技术架构部门的通知：外部基础设施合作技术边界

> 日期：2026-06-20
> 状态：Approved / 请按此口径执行架构评审
> 关联决策：`docs/strategy/external-infrastructure-cooperation-strategic-decision.md`

技术架构团队：

Sinan Engine 已决定采用“Sinan owns contracts, partners own specialized implementations”的合作策略。后续资源加载、输入、相机和 Runtime UI 都可以引入合作方能力，但 Sinan 必须掌握引擎语义层和验收权。

## 1. 架构总原则

所有外部合作都必须满足：

- Data-first：Sinan JSON / schema / registry 是事实源。
- Adapter-first：外部实现通过 adapter 接入，不侵入 core。
- Validation-first：任何合作产物必须能被 tests、validation、smoke 或 dry-run report 验证。
- Fallback-first：POC 失败或外部项目延期时，Sinan 主线必须可继续推进。

## 2. 目录和 import 边界

后续新增 engine systems 时建议保持：

```txt
src/assets/**      resource semantics, catalog facade, Sinan policy
src/input/**       input action/context semantics
src/camera/**      camera system facade / adapter boundary
src/ui/**          runtime UI semantics
src/runtime/**     concrete runtime adapters
src/runtime/three/**  Three-specific implementation
src/editor/**      React editor shell and authoring commands
```

技术红线：

- 外部 core 不得 import `src/editor/**`、`src/runtime/three/**`、React store 或 Sinan private modules。
- `src/events/**`、`src/director/**`、`src/world/**`、`src/assets/**`、`src/input/**`、`src/ui/**` 不应直接 import Three。
- Runtime cache、external GUI state、compiled catalog 都不能成为 Sinan source-of-truth。

## 3. 各方向架构决策

### 3.1 资源加载

Sinan 维护：

- `data/assets.manifest.json`
- asset schema
- ReferenceResolver
- budget/report policy
- asset diagnostics
- fallback policy

Indirection 可提供：

- compiled catalog
- asset scope / handle
- dependency graph
- loader backend
- variant / compressed asset strategy

第一批 RFC：`docs/rfcs/rfc-001-sinan-asset-boundary.md`

### 3.2 输入模块

Sinan 维护：

- Input action 命名
- `InputMap` schema
- context priority
- EngineLoop integration
- World/Event/Editor 映射

InputFlow 可提供：

- browser/gamepad/touch backend
- rebind
- virtual replay
- diagnostics

第一批 RFC：`docs/rfcs/rfc-002-sinan-input-context.md`

### 3.3 相机控制

Sinan 维护：

- `data/cameraShots/*.json`
- CameraShot schema
- DirectorCameraSystem
- Timeline camera track
- preview/scrub/restore camera
- editor CameraShotPanel / commands

ViewRig 可提供：

- follow/orbit/third-person rig
- rail/path camera
- collision/occlusion/confiner
- blend/composer/shake utilities

第一批 RFC：`docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md`

第一步只允许技术 spike，不允许替换 CameraShotPlayer 或 DirectorCameraSystem。

### 3.4 Runtime UI

Sinan 维护：

- Runtime UI ViewModel
- UIActionRef contract
- Timeline/Director subtitle/dialogue source-of-truth
- Editor command/save/undo

LudoWeave 可提供：

- headless runtime UI
- DOM/Canvas renderer
- focus/gamepad navigation
- renderer conformance tests

第一批 RFC：`docs/rfcs/rfc-003-sinan-runtime-ui-viewmodel.md`

## 4. POC 验收要求

每个合作 POC 至少满足：

1. 不替代 Sinan source-of-truth。
2. Adapter 可拔除，Sinan fallback 可运行。
3. 有 contract tests 或 deterministic dry-run。
4. 有 browser smoke 或等价验证。
5. 有结构化 diagnostics。
6. 能在 Gate Demo 或 Showcase slice 中体现价值。
7. 未通过前不进入 hard dependency。

## 5. 架构部门下一步

1. Review 第一批四份 RFC。
2. 将 RFC 里的 import boundary 纳入后续 `scripts/check-boundaries.ts` 规划。
3. 为 Indirection/InputFlow/LudoWeave 分别准备 POC fixture。
4. 为 ViewRig 准备 follow/orbit/rail pose spike fixture，但实现排在资源和输入 POC 之后。
5. 把每个合作 POC 的验收结论写回 Sinan 自有文档，不允许外部项目文档直接成为执行规范。
