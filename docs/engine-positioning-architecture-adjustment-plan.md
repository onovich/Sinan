# Sinan Engine 定位升级后的架构调整构想

> 日期：2026-06-20
> 状态：架构梳理 / 文档方案，不改运行时代码
> 背景：项目已从原先的 Sinan Scene Director 定位升级为 Sinan Engine。原 Director 范围保留为引擎内置的一等子系统，而不是整个产品边界。

---

## 1. 本文目的

本文用于承接最近完成的战略定位升级：Sinan 不再只是一套场景导演、Timeline、Camera Shot 和事件编排工具，而是一个 AI 原生、数据优先、Web 原生的 3D 游戏引擎与项目专用编辑器。

这次升级不是简单改名。它意味着后续架构需要从“导演系统驱动一个演示场景”进一步调整为“引擎核心协调多个 first-party engine systems”，包括 Runtime Core、World、Renderer、Assets、Physics、Input、UI、Director、Editor 和 Data Toolchain。

本文只写构想和可能涉及的文件增删改，不执行代码变更。

---

## 2. 当前项目现状判断

### 2.1 已经完成的定位升级

主入口文档和 README 已经开始使用 Sinan Engine 叙事：

- `README.md` 已说明 Sinan Engine 是 AI-native、data-first 的 Web 3D game engine and editor。
- `docs/Sinan_Scene_Director_研发方案与架构指南.md` 已把 Sinan Scene Director 降级为引擎内部的 Director System。
- `docs/development-plan.md` 已将 Phase 0-7 定义为 architecture MVP，并把 Phase 15+ 路线接到 Abeto-like vertical slice。
- `docs/abeto-messenger-development-plan.md` 已把 Phase 16-26 规划成从风格化渲染、资源预算、Shader、LOD、球形世界、Showcase gameplay 到 multiplayer-lite 的引擎路线。

换句话说，战略叙事已经变了，接下来要做的是让代码结构和阶段路线逐步跟上。

### 2.2 代码基础已经具备的能力

当前项目已经不只是文档/bootstrap 状态。现有代码大致具备：

- `src/schemas/**`：level、prefab、entity、event、condition、action、timeline、cameraShot、renderStyle、palette、asset、material 等 schema。
- `src/data/**`：DataRepository、ReferenceResolver、validateProject、asset budget/report、registry coverage 等数据校验和工具链。
- `src/runtime/WebRuntime.ts`：renderer adapter 的统一接口。
- `src/runtime/three/**`：Three.js runtime、GLB loading、picking、camera control、render style、debug helper、custom material backend 等。
- `src/runtime/materials/**`：Phase 18 已开始加入 renderer-neutral MaterialDefinition / MaterialRuntime / MaterialRegistry。
- `src/shaders/**`：Phase 18 已开始加入 GLSL debug shader。
- `src/events/**`：Trigger、Condition、Action、Event 系统和 AABB trigger。
- `src/director/**`：TimelinePlayer、DirectorSystem、CameraShotPlayer、DirectorCameraSystem，以及 action/animation/property/audio/subtitle/camera track players。
- `src/editor/**`：React 编辑器、Viewport、panels、commands、store、SelectionTool、save/reload/dirty workflow。

这些基础说明：引擎化不是推倒重来，而是在已有 data-first、adapter boundary、registry、validation、editor command 的基础上，把系统边界重新收束。

### 2.3 当前结构中仍带有 Scene Director 时代痕迹的地方

当前最重要的结构性问题不是功能缺失，而是“引擎核心缺位”：

1. `src/editor/Viewport.tsx` 仍然直接负责创建 ThreeRuntime、加载项目、启动 requestAnimationFrame loop、同步 renderStyle/materials/debug helper。
2. `src/runtime/three/ThreeRuntime.ts` 仍然同时承担 renderer、scene object registry、animation mixer、editor camera、transform gizmo、style decorator、material runtime、debug helper 等职责，正在变成 adapter 巨石。
3. `src/events/AabbTriggerSystem.ts` 还把触发器逻辑放在 events 目录中，未来 physics/trigger/collision 应该成为 Physics System 的职责，events 只消费 trigger events。
4. 项目还没有显式的 `src/engine/**`、`src/world/**`、`src/physics/**`、`src/input/**`、`src/ui/**` 语义层。
5. `package.json` 的 name 仍是 `sinan-scene-director`，仓库名也沿用历史名称。短期可以保留，长期需要一次专门迁移。
6. 编辑器是当前唯一真正入口，Showcase/Play Mode 还没有作为引擎运行模式独立出来。

这些问题不会阻塞 Phase 18 的 Shader S0，但会在 Phase 19 之后明显影响材质 timeline、gameplay showcase、输入、物理、UI、LOD、球形世界等后续阶段。

---

## 3. 定位升级后的核心架构原则

### 3.1 Director System 是核心差异点，但不是根系统

原先可以把 Event、Action、Timeline、Camera Shot 当成产品主线。升级后，Director System 应被定位为：

```txt
World / Runtime / Input / Physics / UI / Renderer 之间的编排系统
```

Director 可以：

- 响应 Event 和 Trigger。
- 调度 Action。
- 播放 Timeline。
- 控制 Camera Shot。
- 调度 animation、subtitle、audio、material parameter、UI cue。

Director 不应该：

- 拥有完整 world state。
- 直接访问 Three.js。
- 直接写 shader uniform。
- 取代 Physics System 判断碰撞。
- 取代 Input System 解释玩家输入。
- 取代 UI System 管理 HUD/dialogue 生命周期。

### 3.2 Engine Core 应成为运行闭环的根

后续需要引入一个显式 Engine Core，负责协调：

```txt
EngineSession
  -> DataProject
  -> World
  -> RuntimeAdapter
  -> AssetSystem
  -> InputSystem
  -> PhysicsSystem
  -> EventSystem
  -> DirectorSystem
  -> UISystem
  -> EditorBridge / ShowcaseBridge
```

这样 React Editor 不再是运行时根，只是 EngineSession 的一个 authoring surface。

### 3.3 数据仍然是 source of truth

定位升级不能让引擎语义重新落回 GUI 隐式状态。后续新增系统都应延续当前规则：

- 结构先有 schema。
- JSON 或 TypeScript registry 是可验证契约。
- Runtime adapter 只解释契约，不拥有游戏语义。
- Editor 修改必须走 command。
- Migration 和 ReferenceResolver 跟着 schema 演进。

### 3.4 Adapter boundary 要扩大，而不是只管 Three.js

当前边界主要是“Three 只能在 `src/runtime/three/**`”。升级后应扩展为：

```txt
renderer adapter boundary
physics adapter boundary
input platform boundary
audio/platform boundary
storage/save boundary
UI runtime bridge boundary
```

这意味着后续新增 `src/physics/**`、`src/input/**`、`src/ui/**` 时，它们本身也应保持平台/renderer-neutral；具体 browser、Three、Rapier、DOM、WebSocket 等实现进入 adapter 子目录。

---

## 4. 推荐的目标结构

这是中期目标结构，不要求一次性改完：

```txt
src/
  engine/
    EngineSession.ts
    EngineLoop.ts
    EngineMode.ts
    EngineModule.ts
    EngineCommandQueue.ts
    EngineDiagnostics.ts

  world/
    World.ts
    EntityStore.ts
    ComponentStore.ts
    WorldQuery.ts
    WorldSnapshot.ts

  assets/
    AssetSystem.ts
    AssetCatalog.ts
    AssetPreloadPlan.ts
    AssetLoadingPolicy.ts

  renderer/
    RendererSystem.ts
    RenderCommand.ts
    RenderObjectBinding.ts
    RenderDiagnostics.ts

  runtime/
    WebRuntime.ts
    RuntimeTypes.ts
    materials/
    three/

  physics/
    PhysicsSystem.ts
    ColliderWorld.ts
    TriggerSystem.ts
    RaycastSystem.ts
    adapters/
      aabb/
      rapier/

  input/
    InputSystem.ts
    InputMap.ts
    InputActionState.ts
    BrowserInputAdapter.ts

  ui/
    RuntimeUISystem.ts
    DialogueSystem.ts
    SubtitleSystem.ts
    HudCommand.ts

  events/
    EventSystem.ts
    ActionSystem.ts
    ConditionSystem.ts
    actionRegistry.ts
    conditionRegistry.ts
    triggerRegistry.ts

  director/
    DirectorSystem.ts
    TimelinePlayer.ts
    CameraShotPlayer.ts
    trackPlayers...

  editor/
    EditorApp.tsx
    EditorSessionBridge.ts
    Viewport.tsx
    panels/
    commands/
    store/

  schemas/
  data/
  migrations/
  shaders/
```

关键点：

- `runtime/**` 仍是具体运行时 adapter 入口，不变成所有引擎逻辑的容器。
- `engine/**` 是 orchestration，不引入 Three。
- `world/**` 是游戏语义状态，不引入 React/Three。
- `physics/**` 可以先用 AABB adapter，后续再加 Rapier。
- `renderer/**` 是 renderer-neutral 的渲染语义层；Three 实现仍在 `runtime/three/**`。
- `editor/**` 通过 `EditorSessionBridge` 操作 EngineSession，不直接拥有整个运行闭环。

---

## 5. 接下来最应该做的架构调整

### 5.1 先完成 Phase 18，再做 Engine Core 抽取

当前 Phase 18 已经在进行 Shader GLSL Material Runtime Foundation。建议不要在 Phase 18 中途大规模改运行时根结构，因为 shader S0 正在触碰 `WebRuntime`、`ThreeRuntime`、`src/runtime/materials/**`、`src/shaders/**`、schema 和 smoke tests。

建议顺序：

```txt
1. 先完成 Phase 18 final validation 和 final report。
2. 在 Phase 19 之前插入一个小型 architecture realignment checkpoint。
3. 再进入 dissolve/material timeline/action/editor UI。
```

这个 checkpoint 可以不作为大阶段，也可以命名为：

```txt
Phase 18.5 Engine Core Alignment
```

目标不是新增玩法，而是把 runtime 根、world 根、editor bridge 的边界立起来。

### 5.2 引入 EngineSession，降低 Viewport 的职责

当前 `src/editor/Viewport.tsx` 负责：

- 动态 import `ThreeRuntime`。
- 初始化 runtime。
- 启动 requestAnimationFrame。
- 加载 model assets。
- instantiate entities。
- 同步 transform/renderStyle/materials/debug aabb。
- 处理 editor camera input。

这对编辑器 MVP 很高效，但对于游戏引擎定位过重。建议新增：

```txt
src/engine/EngineSession.ts
src/engine/EngineLoop.ts
src/engine/EngineMode.ts
src/editor/EditorSessionBridge.ts
```

可能的职责调整：

- `EngineSession` 接收 `ProjectData` 和 `WebRuntime`。
- `EngineSession.loadProject(project)` 负责加载 assets、建立 world、实例化 runtime objects。
- `EngineLoop` 负责 update order 和 frame lifecycle。
- `EditorSessionBridge` 负责把 editor selection、gizmo、debug helper、save dirty state 映射到 EngineSession。
- `Viewport.tsx` 只负责 canvas mount、pointer/key event、尺寸变化和 React UI 状态。

可能涉及修改：

- 修改 `src/editor/Viewport.tsx`：移出 `loadProjectIntoRuntime` 和 frame loop。
- 新增 `src/engine/EngineSession.ts`：托管 load/update/render/dispose。
- 新增 `src/engine/EngineMode.ts`：`edit | play | preview | showcase`。
- 新增 `src/engine/EngineLoop.ts`：定义固定 update order。
- 修改测试：把 Viewport smoke 中对 runtime ready 的断言迁移到 EngineSession fixture。

不建议删除：

- 不要删除 `WebRuntime`，它仍是 adapter 关键边界。
- 不要在第一步大改所有 editor panels。

### 5.3 建立 World 语义层

目前 entity 数据主要来自 `ProjectData.level.entities`，运行时对象主要由 `ThreeRuntime` 管理。后续 gameplay、physics、input、AI、delivery jobs、spherical world 都需要一个 renderer-neutral world。

建议新增：

```txt
src/world/World.ts
src/world/EntityStore.ts
src/world/ComponentStore.ts
src/world/WorldQuery.ts
src/world/WorldSnapshot.ts
```

第一阶段只做薄层，不做复杂 ECS：

- 从 `LevelData` 初始化 entity/component store。
- 提供按 id 查询 entity/component。
- 提供 transform 读写接口。
- 提供 enable/visible/state flags 的统一位置。
- 提供 world snapshot 给 tests、debug 和 editor inspector。

可能涉及修改：

- `ActionSystem` 中的 `entity.setVisible`、`entity.setTransform`、`door.open` 等 action 先写 World，再由 EngineSession flush 到 RuntimeAdapter。
- `DirectorSystem` 的 track sampling 不直接假设 runtime state 是唯一状态。
- `EditorCommand` 对 transform/component 的修改仍然改 JSON/editor store，但 preview/play mode 可同步到 World。

谨慎点：

- 不要一开始引入过重 ECS 框架。
- 不要把 Three.Object3D 或 React state 存进 World。
- World 中的 component 类型仍来自 schema/data contract。

### 5.4 把 Physics/Trigger 从 Events 中拆出来

当前 `src/events/AabbTriggerSystem.ts` 是合理 MVP，但从引擎定位看，trigger/collider/raycast 是 Physics System 的职责。

建议演进为：

```txt
src/physics/
  PhysicsSystem.ts
  ColliderWorld.ts
  TriggerSystem.ts
  RaycastSystem.ts
  adapters/
    aabb/AabbPhysicsAdapter.ts
    rapier/RapierPhysicsAdapter.ts
```

迁移原则：

- `src/events/**` 仍保留 EventSystem、ConditionSystem、ActionSystem。
- PhysicsSystem 产出 `trigger.enter`、`trigger.exit`、`collision.*` 等事件候选。
- EventSystem 消费这些事件并匹配 data/events/*.json。
- AABB 实现先迁移到 `physics/adapters/aabb`，Rapier 后置。

可能涉及修改：

- 移动或包装 `src/events/AabbTriggerSystem.ts`。
- 修改 `src/events/TriggerSystem.ts`，让它从 PhysicsSystem 接收 trigger events，而不是自己承担物理检测。
- 新增 `src/schemas/physics.schema.ts` 或扩展 `collider.schema.ts`。
- 更新 `scripts/check-boundaries.ts`，禁止 `src/physics/**` import Three。

不建议立即做：

- 不要立刻接完整 Rapier rigidbody。
- 不要在 PhysicsSystem 里写 gameplay condition。

### 5.5 引入 Input System 和 inputMap 数据

引擎定位下，输入不应长期散落在 `Viewport.tsx` 的 pointer/key handlers 和未来 gameplay 组件里。

建议新增：

```txt
src/input/InputSystem.ts
src/input/InputMap.ts
src/input/InputActionState.ts
src/input/BrowserInputAdapter.ts
src/schemas/input.schema.ts
data/inputMaps/default.json
```

职责：

- 把 keyboard/mouse/pointer/touch/gamepad 映射到 public input action。
- 支持 editor input 和 game input routing。
- 支持 replay/record 的最小设计，方便 AI 和 smoke tests。
- 支持 Showcase Mode 下的 player movement/interact。

可能涉及修改：

- `Viewport.tsx` 中 editor camera input 仍可保留在 editor bridge，但 gameplay input 走 InputSystem。
- Event trigger `entity.interact` 后续应来自 InputSystem + World query，而不是测试按钮或硬编码调用。
- `ActionSystem` 可支持 lock/unlock player control，但输入状态归 InputSystem。

### 5.6 Runtime UI 需要从 Editor UI 中分离

当前 UI 主要是 editor panels，runtime subtitle/audio/HUD 还属于 Director command 和 editor shell 的辅助能力。升级后需要明确：

```txt
Editor UI: React panels, inspector, timeline, asset panel, command state
Runtime UI: HUD, subtitle, dialogue, route marker, delivery job prompt
```

建议新增：

```txt
src/ui/RuntimeUISystem.ts
src/ui/SubtitleSystem.ts
src/ui/DialogueSystem.ts
src/ui/HudCommand.ts
src/schemas/ui.schema.ts
```

可能涉及修改：

- `SubtitleTrackPlayer` 继续产生 renderer-neutral command，但由 UISystem 消费，而不是直接绑定 editor overlay。
- Phase 24 Showcase Mode 的 job prompt、delivery target、route feedback 都放在 RuntimeUISystem。
- React 可以实现 runtime UI view，但不拥有每帧 gameplay state。

### 5.7 Renderer/Material 继续按两层演进

Phase 16 的 `renderStyle` 和 Phase 18 的 `MaterialRuntime` 是两条线：

```txt
renderStyle: 高层风格策略，如 palette-toon、outline、fog、color grade
MaterialRuntime: 具体材质实例、公开参数、ShaderMaterial、fallback、compile diagnostics
```

接下来 Phase 19 加 dissolve/material timeline 时，需要守住：

- Timeline/Event/Editor 只能引用 public material parameter，例如 `progress`。
- 不能把 `uProgress` 写进 JSON。
- 不能在 Director 里直接创建 ShaderMaterial。
- 材质参数 track 应走 `MaterialRuntime.setParameter`。

可能涉及修改：

- 扩展 `src/schemas/timeline.schema.ts`：新增 `material.parameter` track。
- 扩展 `src/director/**`：新增 `MaterialParameterTrackPlayer`。
- 扩展 `src/schemas/action.schema.ts`：新增 `material.setParameter`。
- 扩展 `src/events/actionRegistry.ts` 或 ActionSystem：dispatch 到 MaterialRuntime/EngineCommandQueue。
- 扩展 `ReferenceResolver`：验证 material target entity、slot、parameter、texture。
- 扩展 editor：Material Inspector MVP 后置到 Phase 19，不放进 Phase 18。

### 5.8 ThreeRuntime 需要逐步拆分

`src/runtime/three/ThreeRuntime.ts` 当前是必须存在的 adapter 入口，但后续不应继续无限膨胀。

建议拆出：

```txt
src/runtime/three/ThreeSceneRuntime.ts
src/runtime/three/ThreeAnimationRuntime.ts
src/runtime/three/ThreeCameraRuntime.ts
src/runtime/three/ThreeDebugRuntime.ts
src/runtime/three/ThreeRenderObjectRegistry.ts
src/runtime/three/ThreeEditorGizmoRuntime.ts
```

第一步不需要一次拆完。优先拆：

1. animation mixer 管理。
2. editor camera / transform gizmo。
3. debug AABB helper。
4. material runtime binding。

保留：

- `ThreeRuntime` 作为 `WebRuntime` facade。
- `WebRuntime` 作为 renderer adapter public contract。

避免：

- 不要让 `src/editor/**` import 这些 Three 子 runtime。
- 不要让 `src/director/**` import 这些 Three 子 runtime。

### 5.9 Project identity 迁移应单独做

长期应该把项目元信息从 `sinan-scene-director` 迁到 `sinan-engine`，但这类变更容易产生噪音，建议单独做一个小 commit/阶段。

可能涉及：

- `package.json` 的 `name`：`sinan-scene-director` -> `sinan-engine`。
- `package-lock.json` 同步。
- `index.html` title。
- README badges/links。
- 文档中的历史路径说明。
- GitHub repository rename：如果做，需要先确认 remote 和 Pages/Actions 影响。

不建议：

- 不要和 runtime architecture refactor 混在同一次提交。
- 不要批量重命名所有含 Scene Director 的历史文档标题，除非它们是当前入口文档。

---

## 6. 对现有结构的可能增删改清单

### 6.1 建议新增

| 路径 | 用途 | 优先级 |
| --- | --- | --- |
| `src/engine/EngineSession.ts` | 引擎运行会话根，接管 project load/update/render/dispose | P0 |
| `src/engine/EngineLoop.ts` | 固化 update order，区分 edit/play/preview/showcase | P0 |
| `src/engine/EngineMode.ts` | 定义运行模式 | P0 |
| `src/world/World.ts` | renderer-neutral world state | P0 |
| `src/world/EntityStore.ts` | entity/component 查询与更新 | P1 |
| `src/physics/PhysicsSystem.ts` | trigger/collider/raycast 系统入口 | P1 |
| `src/physics/adapters/aabb/AabbPhysicsAdapter.ts` | 迁移现有 AABB trigger MVP | P1 |
| `src/input/InputSystem.ts` | gameplay/editor input action mapping | P1 |
| `src/schemas/input.schema.ts` | inputMap 数据 schema | P1 |
| `data/inputMaps/default.json` | 默认输入映射 | P1 |
| `src/ui/RuntimeUISystem.ts` | runtime HUD/dialogue/subtitle 命令入口 | P2 |
| `src/renderer/RendererSystem.ts` | renderer-neutral render command/system，可在 ThreeRuntime 继续膨胀前引入 | P2 |
| `docs/engine-architecture-decisions.md` | 记录定位升级后的关键 ADR | P2 |

### 6.2 建议修改

| 路径 | 调整方向 |
| --- | --- |
| `src/editor/Viewport.tsx` | 把 project loading、frame loop、runtime object sync 移到 EngineSession；Viewport 只保留 canvas mount 和 editor input bridge。 |
| `src/runtime/WebRuntime.ts` | 保持 facade 稳定；后续新增能力优先通过 renderer-neutral command/engine bridge，避免接口无限细碎。 |
| `src/runtime/three/ThreeRuntime.ts` | 保留为 WebRuntime 实现，但逐步拆出 animation/camera/debug/material/gizmo 子模块。 |
| `src/events/AabbTriggerSystem.ts` | 迁移或包装到 `src/physics/**`，events 只消费 trigger 结果。 |
| `src/director/TimelinePlayer.ts` | Phase 19 增加 material parameter track 时，继续保持纯采样/调度，不写 Three/uniform。 |
| `src/schemas/timeline.schema.ts` | 新增 `material.parameter` track，不能复用 raw `property: "uProgress"`。 |
| `src/schemas/action.schema.ts` | 新增 `material.setParameter`、input/UI/gameplay 相关 action 时坚持 registry。 |
| `src/data/ReferenceResolver.ts` | 随 material/input/physics/ui/world schema 扩展引用校验。 |
| `scripts/check-boundaries.ts` | 将 `src/engine`、`src/world`、`src/physics`、`src/input`、`src/ui`、`src/renderer` 纳入 Three import 禁区。 |
| `README.md` | 增加新架构调整文档入口；待 identity 迁移时再更新包名/仓库名说明。 |
| `docs/development-plan.md` | 在 Phase 18 和 Phase 19 之间记录 Engine Core Alignment checkpoint。 |

### 6.3 可以后续删除或废弃

| 目标 | 条件 |
| --- | --- |
| `src/events/AabbTriggerSystem.ts` 原路径 | PhysicsSystem 接管 AABB trigger 后删除或转成 re-export compatibility wrapper。 |
| `Viewport.tsx` 中的 `loadProjectIntoRuntime` | EngineSession 承担 project load 后移除。 |
| `ThreeRuntime.update()` 中的 demo-only entity spin 行为 | World/Director/animation/debug 系统接管状态后移除，避免 runtime adapter 持有演示逻辑。 |
| 零散 Scene Director 品牌文案 | Project identity 迁移阶段统一替换；历史阶段报告可保留。 |

---

## 7. 推荐阶段路线

### 7.1 当前阶段：完成 Phase 18

不要打断 Phase 18 的 S0 收尾。当前已经有：

- `src/runtime/materials/**`
- `src/runtime/three/materials/**`
- `src/shaders/materials/debug/**`
- `src/schemas/material.schema.ts`
- `Renderable.materials`
- shader compile smoke

Phase 18 的验收应继续聚焦：

- Renderer-neutral material contract。
- Three ShaderMaterial backend。
- `.glsl?raw`。
- fallback/diagnostics。
- real browser compile test。

### 7.2 Phase 18.5：Engine Core Alignment

建议插入一个轻量 checkpoint：

目标：

- 新增 `EngineSession` 和 `EngineLoop`。
- 新增最小 `World`。
- 从 `Viewport.tsx` 移走 load/update/render/dispose 的大部分职责。
- 不新增 gameplay，不新增 shader production material。

验收：

- 编辑器行为不变。
- smoke 仍能打开 demo room。
- `check-boundaries` 覆盖新目录。
- Viewport 只做 editor surface，不再是 engine root。

### 7.3 Phase 19：Story Material + Material Timeline

在 EngineSession 存在后再做：

- dissolve/open-gate production material。
- `material.parameter` track。
- `material.setParameter` action。
- Material Inspector MVP。
- Timeline/Event/Director 到 MaterialRuntime 的 command path。

收益：

- 材质参数动画不会绑定在 React 或 ThreeRuntime 临时代码上。
- Director 不直接碰 uniform。
- 后续 Phase 20 shader globals/postprocessing 更容易接入 EngineLoop。

### 7.4 Phase 20-24：补齐真正游戏引擎模块

建议后续按这个顺序推进：

1. InputSystem：Showcase Mode 和 player control 的前置。
2. PhysicsSystem：trigger/raycast/character controller 的前置。
3. RuntimeUISystem：delivery job、dialogue、route feedback 的前置。
4. LOD/Instancing：Phase 22 与 renderer/asset budget 结合。
5. Compact spherical world：Phase 23，需要 World/Physics/Input/Camera 全部能协作。
6. Delivery gameplay showcase：Phase 24，首次真正证明 Sinan 是 engine，而不是 editor demo。

---

## 8. 架构风险与应对

### 8.1 风险：Engine Core 抽象过早过大

应对：

- EngineSession 先做薄 orchestration。
- 不引入外部 ECS。
- 不做 plugin/module marketplace。
- 不设计大而全 runtime graph。

### 8.2 风险：ThreeRuntime 继续膨胀

应对：

- 保留 ThreeRuntime facade。
- 新能力先问：这是 renderer adapter 职责，还是 engine/world/director/physics 职责？
- 对 animation/camera/debug/material/gizmo 分模块拆出。

### 8.3 风险：Director 继续吸收所有游戏逻辑

应对：

- Director 只负责编排。
- Input/Physics/UI/World 成为独立系统。
- Action 是跨系统命令入口，不是 Director 私有 API。

### 8.4 风险：数据协议过度扩张

应对：

- 新 JSON 类型必须有真实 runtime/editor 消费路径。
- 所有新增 action/condition/timeline track 都要有 schema、registry、ReferenceResolver、tests。
- 不在 JSON 中加入脚本字符串、GLSL、uniform 名称或任意函数。

### 8.5 风险：编辑器和运行时互相污染

应对：

- Editor 通过 EngineSession/EditorSessionBridge 修改和预览。
- Runtime UI 与 Editor UI 分开。
- React 只显示慢状态和 authoring state。

---

## 9. 最小可执行决策

如果只能选三个接下来最重要的架构调整，建议是：

1. **完成 Phase 18，不扩大范围。** 先把 material/shader S0 收尾，避免在半成品 shader runtime 上做大拆分。
2. **新增 EngineSession + EngineLoop + 最小 World。** 让编辑器不再是运行闭环根，让 Sinan Engine 名副其实地有 engine root。
3. **把 Physics/Input/UI 作为 first-party engine systems 规划，不再让 Events/Director/Viewport 代管。** 先写薄系统，后续 Phase 20-24 再逐步变厚。

这三个动作完成后，项目会从“有引擎定位的编辑器 demo”变成“有编辑器入口的引擎架构”。届时 Phase 19 的 material timeline、Phase 23 的 spherical world、Phase 24 的 delivery gameplay 都会更稳。

---

## 10. 后续文档建议

建议后续再补三份小文档，而不是把所有内容塞回主架构文档：

1. `docs/engine-core-alignment-plan.md`
   具体展开 EngineSession、World、Viewport 迁移步骤和验收。

2. `docs/engine-system-boundaries.md`
   固化 Runtime、Renderer、Physics、Input、UI、Director、Editor、Data 的边界和 forbidden imports。

3. `docs/phase-18-5-engine-core-alignment-goal-mode-execution-guide.md`
   如果要交给 goal-mode executor，就把 Phase 18.5 拆成小 round，要求每轮 validation/smoke/boundary check。

本文档可以作为这三份文档的母版。
