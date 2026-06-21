# Sinan Engine 成熟引擎能力缺口与模块来源策略构想

> 日期：2026-06-20
> 状态：Strategic architecture proposal / 构想文档
> 背景：Sinan 已从 Scene Director 升级为 AI-native、data-first、Web 原生 3D 游戏引擎。本文用于判断距离成熟引擎还缺哪些模块，以及这些模块应自研、与早期项目合作，还是采用成熟方案。

---

## 1. 结论摘要

Sinan 距离“成熟引擎”缺的不是单个大模块，而是一组可验证、可替换、可演进的 first-party engine systems。

最重要的策略不是“全部自研”或“全部外包”，而是：

```txt
Sinan owns semantic contracts.
Mature libraries solve commodity hard problems.
Early partners co-shape AI/data-first infrastructure.
Adapters keep every dependency replaceable.
Validation decides what can enter the roadmap.
```

建议采用三类来源：

1. **Sinan 必须自研并掌握**
   - engine semantic contracts、JSON schema、registries、source-of-truth、validation、ReferenceResolver、editor command/save/undo、EngineLoop、World ownership、Director/Event/Action 语义、adapter boundary、fallback 和验收体系。

2. **适合与早期项目合作**
   - 资源寻址与加载、输入控制、相机 rig、Runtime UI、叙事 authoring 等方向。
   - 这些方向和 Sinan 的 AI-native/data-first 标准强相关，成熟方案往往太通用或太绑定某个宿主；早期项目更容易被 Sinan 的真实 demo、contract tests 和边界原则塑形。

3. **适合采用成熟方案**
   - 物理、浏览器音频底层、多人通信基础设施、协同编辑 CRDT、资源压缩/格式、测试、构建、包发布等。
   - 这些方向不应重新发明核心算法或平台兼容层；Sinan 应通过 adapter 使用成熟能力，同时保留自己的数据契约和运行时语义。

一句话：**Sinan 自研“引擎语义层”，合作塑造“AI-friendly 基础设施”，成熟方案承担“复杂底层能力”。**

---

## 2. 什么叫“成熟引擎”

Sinan 不需要成为 Unity 或 Godot 的克隆。对 Sinan 来说，成熟引擎不是功能最全，而是满足以下标准：

- 有稳定的 runtime root：mode、loop、world、system update order、disposal 和 diagnostics 明确。
- 有 renderer-neutral 的游戏语义：World、Physics、Input、UI、Director、Assets、Audio、Networking 都不直接绑定 Three.js 或 React。
- 数据是事实源：所有游戏语义都能通过 JSON/schema/registry/validation 被人和 AI 安全修改。
- 每个模块有 fallback：外部项目延期、浏览器能力缺失、资源加载失败时，主线可继续推进。
- 每个模块有测试和报告：unit、contract、dry-run、browser smoke、perf smoke、asset report、compatibility matrix。
- 编辑器不是 runtime root：React 只拥有 authoring shell 和慢状态，不承载高频游戏状态。
- 外部能力通过 adapter 接入：成熟库或合作项目都不能取代 Sinan source-of-truth。

成熟度的核心不是“模块数量”，而是“模块边界是否稳定、能否被验证、能否被替换”。

---

## 3. 现状判断

Sinan 已经具备的关键基础：

- `EngineSession`、`EngineLoop`、`EngineMode` 和最小 `World`。
- `WebRuntime` 与 `src/runtime/three/**` 的 Three.js adapter 边界。
- JSON schema、Zod validation、ReferenceResolver、migration check。
- Event / Condition / Action registry。
- Director / Timeline / CameraShot / material timeline。
- GLB loading、asset budget/report、fallback asset 路线。
- renderStyle、MaterialRuntime、GLSL material、post-Phase 19 production shader path。
- React editor、selection、inspector、timeline、Material Inspector、command-backed edits。
- Playwright smoke、boundary check、Validate/Smoke wrappers。

仍明显欠缺或尚未成熟的能力：

- 完整 AssetSystem 生命周期、dependency graph、preload/scope/dispose、variant。
- First-party InputSystem 和 input map。
- PhysicsSystem、collision layers、raycast、character controller。
- Gameplay camera / advanced camera rig / camera collision。
- RuntimeUISystem、HUD、pause、prompt、dialogue、focus/gamepad navigation。
- AudioSystem、mixer、spatial audio、browser unlock、timeline sync、ducking。
- Animation state machine / blend tree / event curves。
- Gameplay framework：jobs、quest、inventory、interaction、objective、save state。
- Navigation/pathfinding/NPC behavior。
- Multiplayer-lite state sync 和 server protocol。
- Live collaboration/editor co-authoring。
- Build/export/package/release pipeline。
- Profiling、runtime diagnostics、perf HUD、memory/GPU/resource counters。
- Plugin/extension boundary、public SDK、sample project ecosystem。

---

## 4. 模块来源总表

| 模块 | 当前成熟度 | Sinan 必须自研 | 推荐来源 | 近期动作 |
| --- | --- | --- | --- | --- |
| Engine Core / Loop / Mode | 已有薄层 | 是 | 自研 | 继续增强 update order、system lifecycle、diagnostics |
| World / Entity / Component | 最小层 | 是 | 自研 | 保持薄 ECS-like，不急引大型 ECS |
| Renderer Adapter | Three 已有 | 是，语义层 | 成熟库 + 自研 adapter | Three 继续主线；未来可评估 Babylon adapter，不迁移事实源 |
| Material / Shader | Phase 19 已成形 | 是 | 自研 + Three adapter | Phase 20/21 继续 |
| Asset System | budget/report 已有 | 是，contract | Indirection 早期合作 + 成熟格式工具 | Phase 21.5/22 前做 manifest report POC |
| Input System | 尚缺 | 是，contract | InputFlow 早期合作 | Sinan 先定义 `InputAction/InputContext/InputMap` |
| Camera System | Director camera 已有 | 是，CameraShot/Director | ViewRig 早期合作 | gameplay follow/orbit pose spike，不替换 CameraShotPlayer |
| Runtime UI | 尚缺 | 是，ViewModel/ActionRef | LudoWeave 早期合作 | Headless Prompt/Subtitle POC |
| Physics / Collision | AABB MVP | 是，schema/layers/events | 成熟方案优先 | 通过 adapter 评估 Rapier 等成熟物理库 |
| Character Controller | 尚缺 | 是，gameplay contract | 成熟 physics + 自研 controller policy | Phase 23 前做最小 kinematic controller |
| Audio | 很薄 | 是，AudioCue/mixer contract | Web Audio / mature library | 增加 AudioSystem facade，底层可用成熟库 |
| Animation Graph | clip 播放基础 | 是，animation state contract | Three AnimationMixer + 自研 graph | 做轻量 state machine，不急自研复杂 DCC |
| Gameplay / Jobs / Quests | 尚缺 | 是 | 自研 | Product-specific，必须 data-first |
| Navigation / Pathfinding | 尚缺 | 是，nav data contract | 成熟算法可选 | 小世界先 graph nav，复杂 navmesh 后置 |
| Narrative Authoring | 尚缺 | 是，runtime ownership | Inscape 早期合作 | dry-run importer，不进 engine core |
| Multiplayer-lite | 尚缺 | 是，message schema/state | 成熟方案可评估 | 单机 Showcase 后再评估 Colyseus 等 |
| Live Collaboration | 尚缺 | 是，document model | 成熟 CRDT 可评估 | 先 Git-first；后续评估 Yjs |
| Build / Export | 基础 Vite | 是，project packaging policy | 成熟工具 + 自研 pipeline | Vite/Rollup 继续；补 deterministic release |
| Profiling / Diagnostics | 分散 | 是 | 自研 + browser APIs | Perf HUD、resource snapshot、frame budget report |
| Plugin / Extension | 尚缺 | 是 | 自研 contract | v1 之后，不提前开放任意脚本 |

---

## 5. 必须自研的模块

这些模块决定 Sinan 是什么。即使底层使用外部库，语义层也必须由 Sinan 掌握。

### 5.1 Engine Semantic Contracts

包括：

- EngineMode。
- EngineLoop update order。
- EngineSession lifecycle。
- System registration。
- diagnostics。
- adapter boundary。
- feature flags。
- fallback policy。

原因：

- 外部项目不能定义 Sinan 的主循环。
- 成熟方案通常会带自己的 lifecycle，不应反向支配 Sinan。
- AI agent 修改项目时必须有稳定入口。

### 5.2 Source-of-truth Data Layer

包括：

- `data/**/*.json`。
- schema。
- migration。
- ReferenceResolver。
- registries。
- validation reports。

原因：

- 这是 Sinan 和传统引擎的差异化根基。
- 任何外部 GUI hidden state、runtime cache、compiled catalog 都不能替代它。

### 5.3 Director / Event / Action / Timeline

包括：

- EventSystem。
- ActionSystem。
- ConditionSystem。
- TimelinePlayer。
- DirectorSystem。
- CameraShotPlayer。
- material timeline/action。

原因：

- Director 是 Sinan 的核心差异点。
- 外部系统可以被 Director 调度，但不能定义 Director 语义。

### 5.4 Editor Command / Save / Undo

包括：

- command objects。
- dirty state。
- save/reload。
- undo/redo。
- inspector authoring。

原因：

- 这是数据安全边界。
- Runtime UI、外部 authoring、AI edit 都必须回到 command path。

### 5.5 Official Adapter Ownership

即使合作方或成熟库提供实现，Sinan 也要保留官方 adapter 或 adapter contract：

```txt
Sinan contract
  -> adapter
  -> external implementation
```

而不是：

```txt
external implementation
  -> Sinan learns whatever it exposes
```

---

## 6. 适合与早期项目合作的模块

早期项目适合的条件：

- 领域与 Sinan 差异化强相关。
- 成熟方案不够 data-first / AI-friendly / engine-neutral。
- Sinan 需要影响其 contract。
- 失败时可以 fallback。
- POC 能小切片验证。
- 合作方愿意保持独立 core，不强行接管 Sinan 事实源。

### 6.1 Indirection：资源寻址与加载

推荐：**强合作，优先级最高。**

Sinan 自研：

- `assets.manifest.json`。
- asset schema。
- ReferenceResolver。
- budget/report policy。
- fallback policy。
- AssetSystem facade。

Indirection 可提供：

- compiled catalog。
- dependency graph。
- scope/handle lifecycle。
- loader backend。
- variant/compression strategy。

为什么适合早期合作：

- Sinan 的 AI/data-first 资源事实源非常明确，可以帮助 Indirection 建立正确边界。
- 资源系统长期很复杂，但第一阶段可用 manifest report 做低风险 POC。
- 成熟方案往往绑定特定引擎或 bundler，不一定适合 Sinan 的 source-of-truth。

风险：

- 过早替换 runtime loader。
- compiled catalog 反客为主。
- adapter 写进 core。

### 6.2 InputFlow：输入系统 backend

推荐：**Sinan 先自研最小 contract，再合作接 backend。**

Sinan 自研：

- InputAction 命名。
- InputContext priority。
- InputMap schema。
- EngineLoop integration。
- World/Event/UI mapping。

InputFlow 可提供：

- browser raw input。
- keyboard/pointer/gamepad。
- rebind。
- virtual input。
- replay。
- diagnostics。

为什么适合早期合作：

- Sinan 对 editor/gameplay/modal/text 的上下文冲突很具体，可帮助 InputFlow 建立真实模型。
- Replay 对 AI smoke 很有价值，成熟输入库未必优先支持。

风险：

- InputFlow 定义 Sinan action namespace。
- raw DOM event 直接触发 gameplay action。
- React 保存高频 input state。

### 6.3 ViewRig：高级相机 solver

推荐：**核心相机自研，高级 rig 合作。**

Sinan 自研：

- `cameraShots/*.json`。
- CameraShot schema。
- CameraShotPlayer。
- DirectorCameraSystem。
- Timeline camera track。
- editor commands。

ViewRig 可提供：

- follow/orbit/third-person solver。
- rail/path sampling。
- composer/dead/soft/hard zone。
- blend/shake。
- collision/confiner。

为什么适合早期合作：

- Cinematic camera 和 gameplay camera 之间的边界很微妙，Sinan 可以提供真实 Director 约束。
- ViewRig 的纯 `CameraState` solver 很适合 adapter 接入。

风险：

- 替换 CameraShotPlayer。
- 保存 ViewRig private state 到 Sinan JSON。
- 直接操作 Three.Camera。

### 6.4 LudoWeave：Runtime UI

推荐：**谨慎合作，只做窄 POC。**

Sinan 自研：

- RuntimeUIViewModel。
- UIActionRef。
- Timeline/Director subtitle/dialogue source-of-truth。
- editor command/save/undo。

LudoWeave 可提供：

- headless UI runtime。
- DOM/Canvas renderer。
- focus/gamepad navigation。
- renderer conformance。

为什么适合早期合作：

- 成熟 Web UI 框架多为 DOM/App UI，不适合 game runtime UI、多 renderer 和 headless replay。
- Sinan 的 Prompt/Subtitle/Pause 是非常好的小型 POC。

风险：

- 范围过大。
- 试图替换 React Editor。
- UI runtime 接管 Director/Timeline 事实源。

### 6.5 Inscape：叙事 authoring pipeline

推荐：**中长期合作，不进 engine core。**

Sinan 自研：

- runtime Event/Action/Condition catalog。
- Host Schema。
- importer report。
- runtime ownership。

Inscape 可提供：

- narrative DSL。
- graph IR。
- diagnostics/source map。
- localization anchors。
- editor authoring。

为什么适合早期合作：

- 叙事 authoring 强依赖 Sinan 的事件和剧情语义。
- 早期共同设计能避免后续导入格式不可控。

风险：

- Inscape 直接生成 runtime side effects。
- 绕过 Sinan action registry。
- narrative source 替代 Sinan project data。

---

## 7. 适合采用成熟方案的模块

成熟方案适合的条件：

- 领域有大量算法/平台兼容成本。
- 不是 Sinan 的差异化核心。
- 可靠性、安全性、性能和社区维护比可塑性更重要。
- 可以通过 adapter 隔离。
- license、bundle size、browser support、maintenance 都可接受。

### 7.1 Physics / Collision

推荐：**采用成熟物理库，通过 Sinan PhysicsSystem adapter 接入。**

Sinan 不应自研完整 3D physics engine。可以自研：

- physics schema。
- collider source-of-truth。
- collision layers。
- trigger event mapping。
- character controller policy。
- debug visualization。

底层可评估成熟方案，如 Rapier JS。Rapier 官方文档提供 JavaScript 使用路径，适合作为 Web 端物理候选之一。

接入边界：

```txt
data physics/collider JSON
  -> Sinan PhysicsSystem
  -> PhysicsAdapter
  -> mature physics library
  -> contacts/raycast/triggers
  -> Sinan EventSystem
```

不要让 physics library 的 object handle 进入 JSON。

### 7.2 Audio

推荐：**Sinan 自研 AudioSystem contract，底层采用 Web Audio 或成熟库。**

Sinan 需要：

- AudioCue schema。
- mixer group。
- volume/ducking policy。
- timeline sync。
- browser unlock state。
- spatial audio contract。
- diagnostics/fallback。

底层可以使用 Web Audio API，或根据需要评估成熟 wrapper。MDN 的 Web Audio API 文档可作为浏览器能力边界参考。类似 howler.js 这样的成熟 Web audio library 也可作为播放/兼容层候选，但不能定义 Sinan 的 audio cue 语义。

### 7.3 Multiplayer-lite

推荐：**单机 Showcase 稳定前不做；后续优先采用成熟 multiplayer framework 作为 server/runtime adapter。**

Sinan 自研：

- network message schema。
- room state contract。
- avatar/emote/stamp semantics。
- validation。
- replay/local remote simulator。

成熟方案可评估 Colyseus 这类 TypeScript multiplayer framework，用于房间、状态同步和服务端框架。它适合承担网络基础设施，但不能定义 Sinan gameplay data。

### 7.4 Live Collaboration

推荐：**先 Git-first，后续有真实多人编辑需求再采用成熟 CRDT。**

Sinan 自研：

- document model。
- command log。
- conflict policy。
- save/undo semantics。

成熟方案可评估 Yjs 这类 CRDT shared data framework。Yjs 可以作为实时协同底层，但不应直接暴露为 Sinan source-of-truth。

### 7.5 Asset Formats / Compression

推荐：**使用成熟标准，不自造格式。**

Sinan 自研：

- asset id。
- manifest。
- metadata。
- budget/report。
- variant policy。

底层继续使用成熟 Web 3D 生态：

- glTF/GLB。
- KTX2/Basis。
- Draco。
- meshopt。
- browser HTTP cache。

不要在近期设计自有 AssetBundle。

### 7.6 Testing / Build / Packaging

推荐：**成熟工具为主，Sinan 自研 project policy。**

继续使用或强化：

- Vite/Rollup 作为 Web build 基础。
- Vitest 做 unit/contract。
- Playwright 做 browser smoke/visual/perf。
- ESLint/Prettier 做 code health。
- Changesets 或类似方案管理未来多包。

Sinan 自研：

- validate command policy。
- smoke scenario。
- asset report。
- boundary check。
- release checklist。
- compatibility matrix。

---

## 8. 不建议采用成熟“完整引擎”替代 Sinan

成熟完整引擎如 Unity、Godot、PlayCanvas、Babylon.js editor ecosystem 等可以作为参考或特定 adapter 方向，但不适合作为 Sinan 的上层替代。

原因：

- 它们通常有自己的 scene graph、editor source-of-truth、asset pipeline、runtime lifecycle。
- Sinan 的核心价值是 Git-friendly data、AI-editable schema、Director/Event/Timeline 语义和 Web-native editor。
- 直接采用完整引擎会把 Sinan 变成插件或内容层，而不是 engine。

可以考虑的方式：

- Three.js 继续作为第一 runtime adapter。
- Babylon.js 可作为远期 renderer adapter 评估对象。
- Unity/Godot 可作为设计参考，不进入 Sinan runtime 主线。

成熟方案应该被“吸收为能力”，而不是“接管产品边界”。

---

## 9. 初创合作 vs 成熟方案的选择规则

### 9.1 选择早期项目合作，当满足以下条件

- 该模块直接影响 Sinan 的 AI-native/data-first 标准。
- 成熟方案会强迫 Sinan 改 source-of-truth。
- 需要共同定义 schema、registry、adapter、diagnostics。
- POC 可以在 Gate Demo / Showcase 中小切片验证。
- 外部项目愿意保持 engine-neutral。
- Sinan 能提供真实宿主和验收标准。
- 失败时 Sinan 有 fallback。

对应模块：

- Indirection。
- InputFlow。
- ViewRig。
- LudoWeave。
- Inscape。

### 9.2 选择成熟方案，当满足以下条件

- 领域算法复杂且已有长期验证。
- 平台兼容风险高。
- 不是 Sinan 的核心差异化。
- 替换成本可以通过 adapter 控制。
- license 和维护状态清楚。

对应模块：

- Physics。
- Web audio playback/mixer 底层。
- Multiplayer server framework。
- CRDT collaboration。
- Asset compression/format toolchain。
- Browser/build/test tooling。

### 9.3 选择完全自研，当满足以下条件

- 模块定义 Sinan 的产品和数据边界。
- 外部方案无法不侵入 source-of-truth。
- 需要严格配合 AI agent、validation、migration、editor command。
- 功能范围初期可以很薄。

对应模块：

- Engine core。
- World semantic layer。
- Director/Event/Action/Timeline。
- Schema/ReferenceResolver。
- Editor command/save/undo。
- Gameplay/job/quest domain。
- Official adapter contracts。

---

## 10. 推荐路线调整

当前 Phase 20/21 仍应继续，不建议中断 shader/postprocessing 质量线。真正需要新增的是 Phase 21 后的合作与成熟度门禁。

建议路线：

```txt
Phase 20
  Shader Globals And Postprocessing Ramp

Phase 21
  Shader Production Quality Gate

Phase 21.5
  Engine Maturity And External Infrastructure Contract Gate

Phase 22
  LOD / Instancing / Vegetation
  + Indirection manifest report / asset backend POC preparation

Phase 23
  Compact Spherical World Prototype
  + InputSystem minimal contract
  + ViewRig pose solver spike
  + Physics adapter evaluation

Phase 24
  Delivery Gameplay Showcase
  + RuntimeUISystem minimal contract
  + LudoWeave Prompt/Subtitle/Pause POC
  + AudioSystem facade

Phase 24.5
  Narrative / Inscape / Localization dry-run gate

Phase 25
  Multiplayer-lite only after single-player Showcase is stable
  + mature networking framework evaluation

Phase 26
  Vertical Slice RC Hardening
  + compatibility matrix
  + dependency risk review
```

### Phase 21.5 建议产物

新增轻量阶段，不做大功能，做架构准入：

- 接受并更新 RFC-001 到 RFC-004。
- 新增 RFC-005 Narrative / Inscape Bridge。
- 新增 RFC-006 Physics Adapter Boundary。
- 新增 RFC-007 Audio System Boundary。
- 定义 `src/assets/adapters/**`、`src/input/adapters/**`、`src/camera/adapters/**`、`src/ui/adapters/**`、`src/physics/adapters/**`、`src/audio/adapters/**` 规则。
- 更新 `scripts/check-boundaries.ts` 的外部依赖隔离规划。
- 建立 partner POC fixture 和 mature dependency evaluation template。
- 建立 compatibility matrix 模板。

---

## 11. 近期 POC 建议

### 11.1 POC A：Asset Backend Report

目标：让 Indirection 读取 Sinan manifest，但不改 runtime。

验收：

- 输出 compiled catalog draft。
- 输出 asset diagnostics。
- 输出 fallback report。
- 输出 budget diff。
- Sinan validation 继续通过。

### 11.2 POC B：Input Replay

目标：Sinan 自研最小 Input contract，InputFlow 提供 backend/replay。

验收：

- `runtime.gameplay.interact` 可由 virtual replay 触发。
- modal/context 可屏蔽 gameplay。
- browser blur reset 有测试。

### 11.3 POC C：Camera Pose Solver

目标：ViewRig 输出 pose，不替换 CameraShotPlayer。

验收：

- 输入 target pose + yaw/pitch/distance。
- 输出 deterministic RuntimeCameraPose。
- Sinan 内置 camera path 可 fallback。

### 11.4 POC D：Runtime UI Headless

目标：LudoWeave 消费 Sinan-like ViewModel。

验收：

- Prompt/Subtitle headless snapshot。
- DOM standalone renderer。
- ActionRef 回到 Sinan bridge。

### 11.5 POC E：Physics Adapter Spike

目标：评估成熟 physics 库能否在 Sinan adapter 边界内工作。

验收：

- collider JSON -> PhysicsSystem -> adapter。
- raycast/trigger enter/exit。
- physics handle 不进入 JSON。
- missing physics backend fallback 到 AABB trigger。

---

## 12. 风险与治理

### 12.1 外部项目过早成为 hard dependency

治理：

- POC 未通过不进入 roadmap hard dependency。
- 每个外部 adapter 必须有 fallback。
- 每个 POC 必须有 contract tests。

### 12.2 成熟方案反向定义 Sinan 架构

治理：

- 成熟库只在 adapter 内出现。
- schema 和 source-of-truth 由 Sinan 定义。
- 不保存外部 handle 到 JSON。

### 12.3 初创合作消耗过多管理成本

治理：

- 一个 POC 一个验收表。
- 不为合作方修完整产品。
- Sinan 只提供 contract、fixture、feedback，不承担其 core 治理。

### 12.4 模块过多导致路线发散

治理：

- Phase 20/21 不改变。
- Phase 21.5 只做 contract gate。
- Phase 22-24 每个阶段最多引入一个主要新 runtime system。

### 12.5 License / scope / brand 未定

治理：

- 所有外部依赖进入官方 adapter 前记录 license。
- npm scope、versioning、compatibility matrix、release note 必须明确。
- early partner 不自动获得 Sinan Engine Infrastructure Kit 身份。

---

## 13. 最小可执行决策

如果只能立刻做五件事，建议是：

1. **保留 Phase 20/21 原路线。** 不因合作策略打断 shader/postprocessing 质量线。
2. **新增 Phase 21.5。** 专门处理成熟引擎模块缺口、外部合作边界和成熟方案评估模板。
3. **明确 adapter 目录策略。** 所有成熟库和早期项目只能通过 adapter 接入。
4. **把 Physics 和 Audio 纳入第一批成熟方案评估。** 这是成熟引擎缺口里最不能长期靠临时代码拖着的两块。
5. **把 Indirection/InputFlow/ViewRig/LudoWeave/Inscape 继续作为第一方设计伙伴，不收编、不硬依赖。** 让它们通过 POC 和 compatibility matrix 自证价值。

---

## 14. 外部成熟方案参考

以下不是立即选型结论，只是本文判断“成熟方案类别”时参考的代表性项目或平台文档：

- Rapier JavaScript docs: <https://rapier.rs/docs/user_guides/javascript/getting_started_js/>
- Web Audio API: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API>
- howler.js docs: <https://howlerjs.com/>
- Colyseus docs: <https://docs.colyseus.io/>
- Yjs docs: <https://docs.yjs.dev/>

正式采用任何成熟方案前，还需要补充：

- license review。
- bundle size review。
- maintenance/release cadence review。
- browser support matrix。
- adapter spike。
- fallback plan。

---

## 15. 最终建议

Sinan 离成熟引擎最关键的距离，不是“缺更多功能”，而是“缺更多可替换、可验证、可演进的系统边界”。

未来 3-6 个阶段的策略应该是：

```txt
自研语义层
早期合作塑造新基础设施
成熟方案承担复杂底层
adapter 和 validation 控制风险
vertical slice 验证真实价值
```

这样 Sinan 不会被横向基础设施拖成一个无限自研项目，也不会被成熟框架吞掉产品边界。它会更像一个有主见的引擎平台：核心语义清楚，外部能力可换，AI 和人都能安全修改，真实 demo 能持续验证架构。
