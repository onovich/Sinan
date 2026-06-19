# Sinan Scene Director：AI 原生 Web 3D 游戏导演系统研发方案与架构指南

> 版本：v0.1  
> 日期：2026-06-17  
> 目标读者：负责实现项目的 AI coding agent、技术负责人、前端/玩法/工具链开发者  
> 项目名：`Sinan Scene Director`  
> 中文说明：**司南场景导演系统**（说明性译名，不作为第二项目名）  
> 推荐仓库名：`sinan-scene-director`  
> 推荐 npm scope：`@sinan-scene/*`

---

## 0. 给实现 AI 的执行摘要

本项目要实现一个 **AI 友好的 Web 原生 3D 游戏开发框架与项目专用编辑器**。它不是 Unity/PlayCanvas/Babylon Editor 的复刻，也不是完整商业游戏引擎。它的核心目标是：

```txt
让 AI 可以通过读写 TypeScript + JSON，快速构建、修改、验证、迁移一个带有 3D 场景、事件联动、Condition、Action、Timeline、角色动画和运镜的游戏项目。
```

第一版选择：

```txt
Three.js         3D runtime
TypeScript       全项目主语言
Vite             dev/build
React            编辑器 UI、HUD、面板、慢状态
Zod              JSON schema 和运行时校验
GLB/glTF         3D 资源格式
Rapier           可选物理层，MVP 可先不用或只接触发器/碰撞
Theatre.js       可选关键帧 authoring 工具，不作为游戏事件真相源
```

最重要的架构原则：

```txt
1. level.json / prefab.json / timeline.json / cameraShot.json 是 source of truth。
2. Three.js 只存在于 /src/runtime/three 以及少数 editor viewport glue 层。
3. /src/game、/src/events、/src/director、/src/world、/src/schemas 禁止 import 'three'。
4. React 只负责编辑器 UI、HUD、菜单、Inspector、Timeline 面板等慢状态。
5. 每帧游戏状态、动画、物理、AI、镜头采样不走 React setState。
6. Event、Condition、Action、Timeline、Camera Shot 全部使用数据驱动 DSL。
7. JSON 中不允许 eval，不允许任意 JS 函数字符串；所有函数调用必须走 registry 白名单。
8. Timeline 可以触发 Action；Event 也可以触发 Action；Action Registry 是统一执行入口。
9. Camera 运镜使用 Virtual Camera / Director Camera，不直接把 Timeline 绑死到 Three.Camera。
10. 未来要从 Three.js 换 Babylon.js，只重写 runtime adapter，不重写游戏逻辑与数据。
```

---

## 1. 项目命名

### 1.1 唯一正式名称

**Sinan Scene Director**

推荐仓库名：

```txt
sinan-scene-director
```

推荐 npm scope：

```txt
@sinan-scene/*
```

本文档后续只使用 **Sinan Scene Director** 作为项目正式名称。不要再使用 `StageWeaver`、`AstraStage Director`、`星幕` 或其他候选名，避免 AI coding agent 在实现时出现命名分叉。

### 1.2 命名理由

这个名字由两部分组成：

```txt
Sinan                 一点点文化属性，来自“司南”，表达方向、引导、定位
Scene Director        直接说明项目用途：场景导演、事件编排、Timeline、运镜
```

选择它的原因：

```txt
1. 比 AstraStage Director 更直白，不再强调抽象的“星空/舞台感”。
2. 比 StageWeaver 更工程化，不会让人误解成偏文学或艺术创作工具。
3. Scene Director 直接对应本项目的核心：配置角色、事件、条件、Action、Timeline、镜头和动画。
4. Sinan 只提供轻微文化辨识度，不把项目包装成重文化品牌。
5. 仓库名、包名、代码命名都容易落地。
```

### 1.3 命名边界

`Sinan` 是文化来源说明，不建议在文档中再单独制造中文品牌名。对外、对内、对 AI coding agent，都统一称为 **Sinan Scene Director**。

本名称仅作为工程名和项目代号，不代表已经完成商标、域名、npm 包名或开源项目重名检查。若未来商业发布，需要单独做命名合规检查。

---

## 2. 产品定位

### 2.1 本项目是什么

Sinan Scene Director 是一个 Web 原生 3D 游戏项目基础设施，包含：

```txt
1. Three.js runtime adapter
2. Entity / Component / World 数据层
3. Prefab / Level JSON 数据协议
4. Event / Trigger / Condition / Action 系统
5. Timeline / Sequencer 系统
6. Virtual Camera / Camera Shot / 运镜系统
7. 角色动画调度系统
8. 项目专用 3D 场景编辑器
9. 项目专用 Timeline 编辑器
10. 项目专用 Camera Shot 编辑器
11. JSON schema 校验、迁移、静态检查工具
12. 面向 AI coding agent 的实现规范与模块边界
```

### 2.2 本项目不是什么

Sinan Scene Director 不是：

```txt
1. 不是完整 Unity 替代品
2. 不是 PlayCanvas Editor 替代品
3. 不是 Blender 替代品
4. 不是完整材质编辑器
5. 不是 Shader Graph
6. 不是完整物理编辑器
7. 不是完整动画制作软件
8. 不是通用低代码游戏引擎
9. 不是所有项目都适用的可视化节点引擎
10. 不是从零自研渲染引擎
```

### 2.3 核心使用方式

典型流程：

```txt
Blender / Mixamo / Maya
  ↓ 导出 GLB
/public/models/*.glb
  ↓
/data/assets.manifest.json
/data/prefabs/*.json
/data/levels/*.json
/data/timelines/*.json
/data/cameraShots/*.json
  ↓
Sinan Scene Director 运行时加载数据
  ↓
Three.js 渲染和播放
  ↓
React Editor 修改 JSON
  ↓
Zod 校验 + migration + tests
```

### 2.4 为什么适合 AI 主导开发

AI coding agent 擅长：

```txt
1. 读写 TypeScript
2. 读写 JSON
3. 基于 schema 生成数据
4. 批量迁移数据
5. 写单元测试
6. 修复编译错误
7. 根据运行日志定位问题
8. 生成 editor 表单
9. 生成 action/condition registry
10. 重构模块边界
```

AI coding agent 不擅长：

```txt
1. 长期操作复杂 GUI
2. 理解云端可视化编辑器隐藏状态
3. 从 Inspector 截图中可靠恢复完整项目状态
4. 修改二进制/专有序列化资产
5. 维护大量无法 diff 的场景状态
6. 处理 Unity/PlayCanvas-like 编辑器中的隐式生命周期
```

因此，项目设计必须让所有关键游戏语义都落在 Git 可追踪文本中。

---

## 3. 选型结论

### 3.1 最终首选技术栈

```txt
Runtime:        Three.js
Language:       TypeScript
Build:          Vite
UI:             React
State:          Zustand 或自研轻量 store
Schema:         Zod
3D Assets:      GLB / glTF 2.0
Physics:        Rapier，MVP 可延后
Timeline UI:    自研轻量 Timeline，Theatre.js 作为可选 authoring 辅助
Testing:        Vitest + Playwright
Lint:           ESLint + import boundary rules
Formatting:     Prettier
```

### 3.2 为什么选 Three.js

选择 Three.js 的核心原因是 **薄、透明、AI 容易掌控**。

Three.js 提供了本项目需要的底层能力：

```txt
1. GLB/glTF 加载
2. Scene / Object3D / Mesh / Camera / Material 基础对象
3. AnimationMixer 播放 GLB 动画
4. Raycaster 做 picking
5. TransformControls 做编辑器移动/旋转/缩放 gizmo
6. WebGL/WebGPU 演进路径
```

本项目不需要 Three.js 提供游戏语义。游戏语义必须由 Sinan Scene Director 自己的数据层定义。

Three.js 官方 `GLTFLoader` 用于加载 glTF 2.0，并返回 scene、scenes、cameras、animations 等数据；这适合本项目的 GLB 资产管线。Three.js `AnimationMixer` 是针对特定 Object3D 的动画播放器，适合播放角色/机关 GLB clip。Three.js `TransformControls` 提供类似 DCC 工具的 translate / rotate / scale 操作，适合 MVP 编辑器。参考文档见文末“资料来源”。

### 3.3 为什么不把 React Three Fiber 作为核心 runtime

React Three Fiber 适合 3D 是 React 产品的一部分的场景，例如：

```txt
1. 3D 商品配置器
2. 3D 家装/房间设计器
3. 数字孪生后台
4. 3D 数据可视化
5. 3D CMS
6. 虚拟展厅 + 表单 + 账号 + 订单
```

这些项目的核心状态往往是：

```txt
用户、表单、选项、价格、权限、项目列表、数据库记录、面板状态
```

本项目更接近游戏和导演系统，核心状态是：

```txt
position、velocity、animation state、physics body、timeline time、condition result、AI state、camera sample、trigger event
```

这些是高频状态，不适合主要走 React setState。React Three Fiber 官方文档也提示快速更新应在 `useFrame` 内 mutation，避免在循环中 setState。

因此本项目策略是：

```txt
React 负责慢状态与 UI。
Three.js runtime 负责 3D 场景、渲染、拾取、动画、gizmo。
World/ECS 负责游戏状态与逻辑。
```

### 3.4 为什么不以 PlayCanvas Editor 为核心

PlayCanvas Editor 像 Web 版 Unity-like 工作台，适合人类团队可视化协作摆场景。但本项目主力是 AI coding agent，需要最大化 Git diff、文本数据、schema 校验、自动迁移和测试。

PlayCanvas Engine 可以作为 runtime 候选，但它带有自己的 Entity/Component/Asset/App 生命周期。如果本项目从第一天就采用 PlayCanvas 的完整范式，很容易重新进入 “AI 只能写脚本，核心场景状态在 Editor/Inspector 中” 的模式。

结论：不使用 PlayCanvas Editor 作为主线。

### 3.5 为什么 Babylon.js 是备选而不是首选

Babylon.js 比 Three.js 更像完整 Web 3D engine，内置 gizmo、inspector、物理、WebXR、资源系统等能力，后期如果 Three.js 自研工具成本上升，可以考虑替换 runtime adapter。

但本项目初期更看重：

```txt
1. 最短反馈回路
2. 最薄 runtime
3. AI 容易理解对象关系
4. 边界可控
5. 不引入过多 engine 心智负担
```

因此首选 Three.js，但保留 Babylon.js 迁移路径。

### 3.6 为什么使用 Zod

所有 JSON 数据必须有运行时校验和 TypeScript 类型推导。Zod 是 TypeScript-first schema validation library，可用于定义 schema、解析数据并获得类型安全结果。

本项目中 Zod 用于：

```txt
1. level.json 校验
2. prefab.json 校验
3. action schema 校验
4. condition schema 校验
5. timeline schema 校验
6. cameraShot schema 校验
7. migration 输入/输出校验
8. editor 表单自动生成的元数据来源
```

### 3.7 为什么 Rapier 是可选物理层

Rapier 提供 JavaScript/WASM 包，包括 `@dimforge/rapier3d`。Rapier 实际是 WebAssembly 模块，需要异步加载。MVP 阶段可以先不接完整刚体物理，只实现 trigger zone / AABB / raycast 级别的交互；如果需要角色控制、碰撞、刚体，再接 Rapier。

建议策略：

```txt
MVP：自研简单 trigger/collider 数据结构。
Alpha：接 Rapier scene queries、colliders、character controller。
Beta：完善 rigid body、debug render、物理同步。
```

### 3.8 Theatre.js 的定位

Theatre.js 可以和 Three.js 集成，用于给 camera、light、material color 等属性做关键帧动画；它有 `@theatre/studio` 编辑 GUI 和 `@theatre/core` 播放运行时，并支持导出 JSON 状态。

但 Theatre.js 不应该成为本项目事件系统、Condition、任务状态、Action 执行的 source of truth。

推荐定位：

```txt
可选 authoring 辅助，用于镜头/灯光/材质等关键帧编辑。
不作为核心 Event/Timeline DSL。
不让 Theatre 项目状态取代 Sinan Scene Director 的 timeline.json。
```

---

## 4. 架构总览

### 4.1 分层结构

```txt
┌─────────────────────────────────────────────┐
│ React Editor / HUD / Panels                 │
│ Hierarchy / Inspector / Timeline / Camera   │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Editor Application Layer                    │
│ Commands / Undo / Selection / Save / Tools  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Game Semantic Layer                         │
│ Entity / Component / Event / Timeline       │
│ Condition / Action / Director / CameraShot  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Runtime Adapter Layer                       │
│ WebRuntime interface                        │
│ ThreeRuntime implementation                 │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Three.js / Browser APIs                     │
│ WebGL / Canvas / Audio / Input              │
└─────────────────────────────────────────────┘
```

### 4.2 Source of truth

唯一真相源：

```txt
/data/assets.manifest.json
/data/prefabs/*.json
/data/levels/*.json
/data/events/*.json，可内嵌于 level
/data/timelines/*.json
/data/cameraShots/*.json
/data/dialogues/*.json，可选
/data/quests/*.json，可选
```

不是 source of truth 的东西：

```txt
1. Three.Scene
2. Three.Object3D
3. React component tree
4. runtime cache
5. editor selection store
6. gizmo 当前状态
7. browser localStorage
8. Theatre.js localStorage state
```

### 4.3 核心模块

```txt
/src/world
  Entity、Component、World、Query、GameState

/src/runtime
  WebRuntime interface、runtime object handles、asset handles

/src/runtime/three
  ThreeRuntime、GLB loader、object registry、picking、gizmo、animation bridge

/src/events
  TriggerSystem、ConditionSystem、ActionSystem、registries

/src/director
  TimelinePlayer、TrackPlayer、DirectorSystem、CameraShotPlayer、DirectorCameraSystem

/src/game
  项目专用 gameplay components 与 systems

/src/editor
  React editor shell、panels、timeline UI、camera editor、commands、save/load

/src/schemas
  Zod schemas、types、validators

/src/migrations
  数据版本迁移

/src/tools
  CLI validator、asset checker、reference checker
```

---

## 5. 推荐目录结构

```txt
sinan-scene-director/
  package.json
  vite.config.ts
  tsconfig.json
  eslint.config.js
  README.md

  public/
    models/
      level_01.glb
      props.glb
      characters/
        guard.glb
        player.glb
    textures/
    audio/

  data/
    assets.manifest.json
    prefabs/
      door_wood.json
      switch_wall.json
      npc_guard.json
      trigger_box.json
    levels/
      level_01.json
    timelines/
      tl_open_gate.json
      tl_intro_cutscene.json
    cameraShots/
      cam_gate_reveal.json
      cam_intro_path.json

  src/
    main.tsx
    App.tsx

    runtime/
      WebRuntime.ts
      RuntimeTypes.ts
      RuntimeObjectHandle.ts
      RuntimeCommands.ts
      three/
        ThreeRuntime.ts
        ThreeAssetLoader.ts
        ThreeObjectRegistry.ts
        ThreePicking.ts
        ThreeTransformGizmo.ts
        ThreeAnimationRuntime.ts
        ThreeCameraRuntime.ts
        ThreeDisposal.ts

    world/
      World.ts
      Entity.ts
      Component.ts
      ComponentStore.ts
      Query.ts
      GameClock.ts
      GameState.ts
      WorldCommands.ts

    game/
      components/
        TransformComponent.ts
        RenderableComponent.ts
        InteractableComponent.ts
        SwitchComponent.ts
        DoorComponent.ts
        TriggerZoneComponent.ts
        AnimationControllerComponent.ts
        NPCComponent.ts
        PlayerSpawnComponent.ts
        PatrolPathComponent.ts
      systems/
        InteractionSystem.ts
        SwitchSystem.ts
        DoorSystem.ts
        TriggerZoneSystem.ts
        AnimationSystem.ts
        PlayerControlSystem.ts

    events/
      EventSystem.ts
      TriggerSystem.ts
      ConditionSystem.ts
      ActionSystem.ts
      actionRegistry.ts
      conditionRegistry.ts
      triggerRegistry.ts
      types.ts

    director/
      DirectorSystem.ts
      TimelinePlayer.ts
      TimelineTrackPlayer.ts
      tracks/
        ActionTrackPlayer.ts
        AnimationTrackPlayer.ts
        CameraShotTrackPlayer.ts
        PropertyTrackPlayer.ts
        AudioTrackPlayer.ts
        SubtitleTrackPlayer.ts
      CameraShotPlayer.ts
      DirectorCameraSystem.ts
      VirtualCamera.ts
      easing.ts

    editor/
      EditorApp.tsx
      Viewport.tsx
      store/
        editorStore.ts
        selectionStore.ts
      commands/
        Command.ts
        CommandHistory.ts
        TransformEntityCommand.ts
        UpdateComponentCommand.ts
        AddEntityCommand.ts
        DeleteEntityCommand.ts
      panels/
        HierarchyPanel.tsx
        InspectorPanel.tsx
        AssetPanel.tsx
        EventInspector.tsx
        TimelinePanel.tsx
        CameraShotPanel.tsx
        DebugPanel.tsx
      tools/
        SelectionTool.ts
        TransformTool.ts
        CameraPreviewTool.ts
        TriggerZoneTool.ts
      forms/
        SchemaForm.tsx
        ComponentForm.tsx
        ConditionForm.tsx
        ActionForm.tsx

    schemas/
      common.schema.ts
      asset.schema.ts
      transform.schema.ts
      component.schema.ts
      entity.schema.ts
      prefab.schema.ts
      level.schema.ts
      event.schema.ts
      trigger.schema.ts
      condition.schema.ts
      action.schema.ts
      timeline.schema.ts
      cameraShot.schema.ts

    data/
      loadJson.ts
      saveJsonDev.ts
      DataRepository.ts
      ReferenceResolver.ts
      validateProject.ts

    migrations/
      migrate.ts
      v1_to_v2.ts

    tests/
      fixtures/
      unit/
      integration/

  scripts/
    validate-data.ts
    check-references.ts
    generate-types.ts
    migrate-data.ts
```

---

## 6. Import 边界规则

### 6.1 禁止规则

```txt
/src/game/**       禁止 import 'three'
/src/world/**      禁止 import 'three'
/src/events/**     禁止 import 'three'
/src/director/**   原则上禁止 import 'three'，只通过 RuntimeCameraBridge 等接口访问 runtime
/src/schemas/**    禁止 import 'three'
/src/data/**       禁止 import 'three'
/src/migrations/** 禁止 import 'three'
```

允许：

```txt
/src/runtime/three/** 可以 import 'three'
/src/editor/Viewport.tsx 可以初始化 runtime，但不直接操作 Three object
/src/editor/tools/** 如确需与 gizmo 交互，必须通过 WebRuntime interface
```

### 6.2 为什么要这样

为了让未来 Three.js → Babylon.js 的迁移成本控制在 `/src/runtime/three`。如果 game/director/events 到处直接访问 `THREE.Object3D`，后期换 runtime 会变成半重写。

### 6.3 推荐 ESLint 规则

实现 AI 应添加 import boundary 检查。伪配置：

```js
// eslint.config.js concept
{
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'three',
            message: 'Only /src/runtime/three may import three directly.'
          }
        ]
      }
    ]
  }
}
```

实际需要按目录 override：只在 `src/runtime/three/**` 放开。

---

## 7. 基础数据协议

### 7.1 通用类型

```ts
export type EntityId = string
export type PrefabId = string
export type TimelineId = string
export type CameraShotId = string
export type AssetId = string

export type Vec3 = [number, number, number]
export type Quat = [number, number, number, number]

export interface TransformData {
  position: Vec3
  rotation: Quat
  scale: Vec3
}
```

Rotation 存储使用 quaternion，不使用 Three Euler 内部格式。编辑器可以显示 Euler degrees，但保存时必须转换为 quaternion。

### 7.2 Asset Manifest

```json
{
  "schemaVersion": 1,
  "assets": {
    "model.door_wood": {
      "type": "model",
      "url": "/models/props/door_wood.glb"
    },
    "model.guard": {
      "type": "model",
      "url": "/models/characters/guard.glb"
    },
    "audio.gate_open": {
      "type": "audio",
      "url": "/audio/gate_open.mp3"
    }
  }
}
```

### 7.3 Prefab

Prefab 描述可复用对象模板。

```json
{
  "schemaVersion": 1,
  "id": "door_wood",
  "name": "Wood Door",
  "model": "model.door_wood",
  "defaultTransform": {
    "position": [0, 0, 0],
    "rotation": [0, 0, 0, 1],
    "scale": [1, 1, 1]
  },
  "components": {
    "Renderable": {
      "model": "model.door_wood"
    },
    "Door": {
      "locked": false,
      "openAngle": 95,
      "openDuration": 0.45
    },
    "Collider": {
      "type": "box",
      "size": [1.2, 2.4, 0.3],
      "isTrigger": false
    }
  }
}
```

### 7.4 Level

```json
{
  "schemaVersion": 1,
  "id": "level_01",
  "name": "Gate Demo",
  "environment": {
    "background": "#111111",
    "ambientLight": 0.35
  },
  "entities": [
    {
      "id": "player_spawn_01",
      "prefab": "player_spawn",
      "transform": {
        "position": [0, 0, 3],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1]
      },
      "components": {
        "PlayerSpawn": {
          "kind": "default"
        }
      }
    },
    {
      "id": "switch_a",
      "prefab": "switch_wall",
      "transform": {
        "position": [2, 1, 4],
        "rotation": [0, 0, 0, 1],
        "scale": [1, 1, 1]
      },
      "components": {
        "Switch": {
          "initialState": false
        },
        "Interactable": {
          "prompt": "按 E 启动开关"
        }
      }
    },
    {
      "id": "gate_a",
      "prefab": "door_wood",
      "transform": {
        "position": [5, 0, 8],
        "rotation": [0, 0.7071068, 0, 0.7071068],
        "scale": [1, 1, 1]
      },
      "components": {
        "Door": {
          "locked": true,
          "requiredKey": "gate_key",
          "openAngle": 95
        }
      }
    }
  ],
  "events": [
    "ev_switch_a_open_gate"
  ],
  "timelines": [
    "tl_open_gate"
  ],
  "cameraShots": [
    "cam_gate_reveal"
  ]
}
```

---

## 8. Entity / Component / World 设计

### 8.1 Entity

Entity 是游戏语义对象，不是 Three.Object3D。

```ts
export interface EntityData {
  id: EntityId
  prefab?: PrefabId
  transform: TransformData
  components: Record<string, unknown>
}
```

### 8.2 Component

Component 是纯数据。

```ts
export interface DoorComponent {
  locked: boolean
  requiredKey?: string
  openAngle: number
  openDuration?: number
  isOpen?: boolean
}
```

组件逻辑在 system 中：

```ts
export class DoorSystem {
  update(world: World, dt: number) {
    // 处理 Door 状态变化，发 runtime command 或 action
  }
}
```

### 8.3 World

World 持有：

```txt
1. entities
2. component stores
3. game state flags
4. event bus
5. command queue
6. runtime handle registry
```

World 不直接依赖 Three。

### 8.4 Runtime handle

Entity 与 runtime object 的关系通过 handle 维护：

```ts
export interface RuntimeObjectHandle {
  entityId: EntityId
  runtimeObjectId: string
}
```

不允许在 Entity 上存 `THREE.Object3D`。

---

## 9. WebRuntime Adapter

### 9.1 Interface

```ts
export interface PickResult {
  entityId: string
  point: Vec3
  normal?: Vec3
}

export interface ModelHandle {
  assetId: string
}

export interface WebRuntime {
  init(canvas: HTMLCanvasElement): Promise<void>

  loadModel(assetId: string, url: string): Promise<ModelHandle>
  instantiateModel(assetId: string, entityId: string): RuntimeObjectHandle
  createEmpty(entityId: string): RuntimeObjectHandle
  destroyObject(entityId: string): void

  setTransform(entityId: string, transform: TransformData): void
  getTransform(entityId: string): TransformData
  setVisible(entityId: string, visible: boolean): void

  playAnimation(input: {
    entityId: string
    clip: string
    loop?: boolean
    fadeIn?: number
    fadeOut?: number
    timeScale?: number
  }): void

  stopAnimation(input: {
    entityId: string
    clip?: string
    fadeOut?: number
  }): void

  setAnimationTime(input: {
    entityId: string
    clip: string
    time: number
  }): void

  setCameraPose(input: CameraPose): void
  getCameraPose(): CameraPose

  pick(clientX: number, clientY: number): PickResult | null

  attachTransformGizmo(entityId: string): void
  detachTransformGizmo(): void
  setTransformGizmoMode(mode: 'translate' | 'rotate' | 'scale'): void

  update(dt: number): void
  render(): void
  dispose(): void
}
```

### 9.2 ThreeRuntime 责任

`ThreeRuntime` 负责：

```txt
1. WebGLRenderer 初始化
2. Scene/Camera 创建
3. GLTFLoader 加载 GLB
4. Object3D clone/instantiate
5. EntityId ↔ Object3D registry
6. AnimationMixer 管理
7. Raycaster picking
8. TransformControls gizmo
9. Camera pose 应用
10. dispose 资源释放
```

### 9.3 Game 层如何使用 runtime

Game 层不操作 Three 对象，只发命令：

```ts
world.commands.enqueue({
  type: 'runtime.setTransform',
  entityId: 'gate_a',
  transform: nextTransform
})
```

runtime system 统一消费命令。

---

## 10. Event / Trigger / Condition / Action 系统

### 10.1 总体模型

Event 结构：

```txt
trigger   什么时候触发
condition 是否允许执行
actions   执行什么
```

```json
{
  "schemaVersion": 1,
  "id": "ev_switch_a_open_gate",
  "trigger": {
    "type": "entity.interact",
    "entityId": "switch_a"
  },
  "condition": {
    "all": [
      {
        "type": "flag.equals",
        "flag": "power_enabled",
        "value": true
      },
      {
        "type": "inventory.hasItem",
        "itemId": "gate_key"
      }
    ]
  },
  "actions": [
    {
      "type": "switch.setState",
      "entityId": "switch_a",
      "value": true
    },
    {
      "type": "timeline.play",
      "timelineId": "tl_open_gate"
    }
  ]
}
```

### 10.2 Trigger 类型

MVP 支持：

```txt
entity.interact       玩家与实体交互
trigger.enter         实体进入 TriggerZone
trigger.exit          实体离开 TriggerZone
level.start           关卡开始
timeline.finished     Timeline 播放结束
action.completed      某 Action 完成
flag.changed          flag 改变
```

后续可扩展：

```txt
dialogue.finished
quest.stepChanged
combat.enemyDefeated
animation.finished
cameraShot.finished
```

### 10.3 Condition DSL

Condition 是表达式树，不是脚本。

```json
{
  "all": [
    {
      "type": "flag.equals",
      "flag": "power_enabled",
      "value": true
    },
    {
      "any": [
        {
          "type": "inventory.hasItem",
          "itemId": "red_key"
        },
        {
          "type": "quest.stateEquals",
          "questId": "main_quest",
          "state": "gate_unlocked"
        }
      ]
    }
  ]
}
```

MVP condition：

```txt
all
any
not
flag.equals
flag.exists
inventory.hasItem
quest.stateEquals
entity.stateEquals
distance.lessThan
custom.condition
```

`custom.condition` 必须走 registry：

```json
{
  "type": "custom.condition",
  "name": "bossDefeated",
  "params": {
    "bossId": "boss_01"
  }
}
```

### 10.4 Action DSL

Action 是统一执行单元。

MVP action：

```txt
flag.set
flag.toggle
entity.setVisible
entity.setEnabled
entity.setTransform
entity.animateTransform
switch.setState
door.open
door.close
timeline.play
timeline.stop
camera.playShot
animation.play
animation.stop
sound.play
subtitle.show
function.call
```

`function.call` 必须走白名单 registry：

```ts
export const callableFunctions = {
  'quest.start': startQuest,
  'quest.advance': advanceQuest,
  'combat.spawnEnemy': spawnEnemy,
  'ui.showMessage': showMessage,
  'dialogue.start': startDialogue
}
```

JSON：

```json
{
  "type": "function.call",
  "name": "combat.spawnEnemy",
  "params": {
    "prefab": "enemy_slime",
    "spawnPoint": "spawn_slime_01",
    "count": 3
  }
}
```

### 10.5 禁止 eval

绝对禁止：

```json
{
  "onInteract": "openGateAndPlayCamera()"
}
```

绝对禁止：

```ts
eval(action.script)
new Function(action.code)
window[action.name]()
```

原因：

```txt
1. 无法静态分析
2. 无法可靠迁移
3. 无法安全执行
4. AI 难以校验引用
5. 编辑器难以生成表单
```

---

## 11. Director / Timeline / Sequencer 系统

### 11.1 Director 的职责

Director System 是游戏导演层，负责统一协调：

```txt
1. Timeline 播放
2. Camera Shot 播放
3. 角色动画调度
4. Action marker 执行
5. Timeline scrub/seek/preview
6. Cutscene 中玩家控制权接管/恢复
7. 运镜 blend/shake/follow/lookAt
8. Timeline 完成事件派发
```

### 11.2 Timeline 数据结构

```json
{
  "schemaVersion": 1,
  "id": "tl_open_gate",
  "name": "Open Gate Timeline",
  "duration": 4.5,
  "settings": {
    "skippable": true,
    "lockPlayerControl": true,
    "restoreCameraOnFinish": true
  },
  "tracks": [
    {
      "id": "track_camera_gate_reveal",
      "type": "camera.shot",
      "start": 0,
      "duration": 3.5,
      "shotId": "cam_gate_reveal",
      "blendIn": 0.25,
      "blendOut": 0.4
    },
    {
      "id": "track_gate_open_anim",
      "type": "animation.play",
      "start": 0.4,
      "entityId": "gate_a",
      "clip": "Open",
      "loop": false,
      "fadeIn": 0.1
    },
    {
      "id": "track_sound_switch",
      "type": "action",
      "time": 0.2,
      "action": {
        "type": "sound.play",
        "soundId": "switch_click"
      }
    },
    {
      "id": "track_sound_gate",
      "type": "action",
      "time": 1.1,
      "action": {
        "type": "sound.play",
        "soundId": "gate_open_heavy"
      }
    },
    {
      "id": "track_set_flag",
      "type": "action",
      "time": 3.8,
      "action": {
        "type": "flag.set",
        "flag": "gate_a_opened",
        "value": true
      }
    }
  ]
}
```

### 11.3 Track 类型

MVP track：

```txt
action              某时刻执行 Action
animation.play      播放 GLB animation clip
camera.shot         播放 Camera Shot
property            连续属性关键帧
wait                等待/占位
subtitle            字幕
sound               音效/音乐
```

后续 track：

```txt
dialogue
branch
conditionGate
screenFade
cameraShake
spawn
particle
```

### 11.4 离散轨道与连续轨道

离散轨道：在某个时间点执行一次。

```json
{
  "type": "action",
  "time": 1.25,
  "action": {
    "type": "subtitle.show",
    "speaker": "npc_guard_01",
    "text": "门开了。",
    "duration": 2.0
  }
}
```

连续轨道：每帧采样。

```json
{
  "type": "property",
  "target": "light_gate",
  "property": "Light.intensity",
  "keys": [
    { "time": 0, "value": 0.2, "ease": "linear" },
    { "time": 2, "value": 3.0, "ease": "easeOutCubic" },
    { "time": 4, "value": 1.0, "ease": "easeInOutCubic" }
  ]
}
```

### 11.5 TimelinePlayer API

```ts
export interface TimelinePlayer {
  play(timelineId: string, options?: TimelinePlayOptions): void
  pause(timelineId: string): void
  resume(timelineId: string): void
  stop(timelineId: string): void
  seek(timelineId: string, time: number): void
  scrub(timelineId: string, time: number): void
  isPlaying(timelineId: string): boolean
  update(dt: number): void
}
```

`scrub` 用于编辑器预览，必须尽可能无副作用或可重建状态。对于离散 action，scrub 阶段默认不执行具有永久副作用的 action，除非该 action 声明 `previewSafe: true`。

### 11.6 Timeline side effect 分类

Action 需要声明副作用级别：

```ts
export type ActionSideEffect =
  | 'none'          // 纯预览，例如设置临时相机 pose
  | 'previewSafe'   // 可在 scrub 时执行，例如预览字幕
  | 'runtimeOnly'   // 只能运行时执行，例如加道具、存档
  | 'destructive'   // 需要明确确认，例如删除 entity
```

编辑器 scrub 默认只执行：

```txt
none
previewSafe
```

---

## 12. Camera Shot / 运镜系统

### 12.1 核心原则

Timeline 不直接控制 Three.Camera。它控制 Virtual Camera：

```txt
Timeline → CameraShotPlayer → DirectorCameraSystem → RuntimeCameraBridge → Three.Camera
```

这样未来换 Babylon.js 只换 RuntimeCameraBridge。

### 12.2 CameraPose

```ts
export interface CameraPose {
  position: Vec3
  rotation?: Quat
  lookAt?: Vec3 | EntityId
  fov: number
  near?: number
  far?: number
}
```

### 12.3 Camera Shot 数据结构

```json
{
  "schemaVersion": 1,
  "id": "cam_gate_reveal",
  "name": "Gate Reveal Shot",
  "type": "keyframed",
  "duration": 3.5,
  "keys": [
    {
      "time": 0,
      "position": [2, 1.6, 5],
      "lookAt": [4, 1.2, 8],
      "fov": 55,
      "ease": "easeInOutCubic"
    },
    {
      "time": 1.5,
      "position": [3, 1.8, 6.5],
      "lookAt": "gate_a",
      "fov": 45,
      "ease": "easeInOutCubic"
    },
    {
      "time": 3.5,
      "position": [5, 2.2, 9],
      "lookAt": "gate_a",
      "fov": 38,
      "ease": "easeOutCubic"
    }
  ]
}
```

### 12.4 Camera Shot 类型

MVP：

```txt
static       固定镜头
keyframed    关键帧镜头
follow       跟随目标
lookAt       固定看向目标
```

后续：

```txt
orbit        环绕目标
rail         轨道镜头
handheld     手持抖动
dialogue     对话镜头
combat       战斗镜头
```

### 12.5 Camera Editor MVP 功能

```txt
1. 创建 camera shot
2. 进入 View Through Shot 模式
3. 将当前编辑器视角保存为 keyframe
4. 选中 keyframe 并编辑 position/lookAt/fov/time/ease
5. 拖动时间预览 shot
6. 播放 shot
7. Look At Selected
8. Set Key From View
9. Bake Current Camera To Key
10. 从 Director Camera 切回玩家相机
```

---

## 13. Animation 系统

### 13.1 资源侧

角色和机关动画在 Blender/Maya/Mixamo 中制作，导出 GLB。

GLB 中包含：

```txt
1. mesh
2. skeleton/skin
3. animation clips
4. material/texture
```

### 13.2 运行时

ThreeRuntime 管理每个 animated entity 的 `AnimationMixer`。Game/Director 层只发：

```json
{
  "type": "animation.play",
  "entityId": "npc_guard_01",
  "clip": "PointToGate",
  "fadeIn": 0.2,
  "fadeOut": 0.2,
  "loop": false
}
```

### 13.3 Timeline 中的动画

```json
{
  "id": "track_npc_point",
  "type": "animation.play",
  "start": 0.5,
  "entityId": "npc_guard_01",
  "clip": "PointToGate",
  "fadeIn": 0.2,
  "fadeOut": 0.2,
  "loop": false
}
```

### 13.4 Scrub 支持

编辑器拖动 timeline 时，需要支持动画 seek：

```ts
runtime.setAnimationTime({
  entityId: 'npc_guard_01',
  clip: 'PointToGate',
  time: 1.2
})
```

Three.js `AnimationMixer.setTime()` 可用于跳到指定动画时间。

---

## 14. 编辑器设计

### 14.1 UI 布局

```txt
┌─────────────────────────────────────────────────────────────┐
│ Top Bar: Play | Edit | Save | Validate | Tool Mode          │
├───────────────┬───────────────────────────────┬─────────────┤
│ Hierarchy     │ 3D Viewport                    │ Inspector   │
│ Entities      │ Selection/Gizmo/Camera Preview │ Components  │
│ Events        │                               │ Event Form  │
│ Assets        │                               │ Shot Form   │
├───────────────┴───────────────────────────────┴─────────────┤
│ Timeline Panel / Sequencer                                  │
└─────────────────────────────────────────────────────────────┘
```

### 14.2 编辑模式

```txt
Edit Mode      可选择/移动/编辑实体，不运行游戏逻辑
Play Mode      运行游戏逻辑，允许测试事件/Timeline
Preview Mode   预览 Timeline/CameraShot，不提交永久副作用
```

### 14.3 Editor Store

React store 只保存慢状态：

```ts
interface EditorState {
  mode: 'edit' | 'play' | 'preview'
  selectedEntityId?: string
  selectedTimelineId?: string
  selectedCameraShotId?: string
  activeTool: 'select' | 'move' | 'rotate' | 'scale' | 'camera'
  timelineTime: number
  inspectorTab: 'components' | 'events' | 'timeline' | 'camera'
}
```

不要把所有 entity transform 每帧同步进 React state。

### 14.4 Command / Undo / Redo

所有编辑器修改走 Command：

```ts
export interface EditorCommand {
  id: string
  label: string
  do(ctx: EditorContext): void
  undo(ctx: EditorContext): void
}
```

常见命令：

```txt
AddEntityCommand
DeleteEntityCommand
DuplicateEntityCommand
TransformEntityCommand
UpdateComponentCommand
AddEventCommand
UpdateEventCommand
AddTimelineTrackCommand
UpdateTimelineKeyCommand
AddCameraKeyCommand
```

### 14.5 保存策略

MVP 中有两种保存方式：

```txt
1. Dev server 模式：通过本地 API 写回 data/*.json
2. Browser-only 模式：导出 JSON 文件，由用户手动替换
```

推荐 MVP 先实现 Dev server API：

```txt
POST /__astra/save-json
{
  "path": "data/levels/level_01.json",
  "data": {...}
}
```

必须限制写入目录，只允许写 `data/**`，防止任意文件写入。

---

## 15. Zod Schema 指南

### 15.1 Transform schema

```ts
import { z } from 'zod'

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()])
export const QuatSchema = z.tuple([z.number(), z.number(), z.number(), z.number()])

export const TransformSchema = z.object({
  position: Vec3Schema,
  rotation: QuatSchema,
  scale: Vec3Schema
})

export type TransformData = z.infer<typeof TransformSchema>
```

### 15.2 Condition schema 方向

```ts
export const FlagEqualsConditionSchema = z.object({
  type: z.literal('flag.equals'),
  flag: z.string(),
  value: z.union([z.boolean(), z.string(), z.number()])
})

export const InventoryHasItemConditionSchema = z.object({
  type: z.literal('inventory.hasItem'),
  itemId: z.string()
})

export type ConditionData =
  | { all: ConditionData[] }
  | { any: ConditionData[] }
  | { not: ConditionData }
  | z.infer<typeof FlagEqualsConditionSchema>
  | z.infer<typeof InventoryHasItemConditionSchema>
```

递归 schema 使用 `z.lazy()` 实现。

### 15.3 Action schema 方向

```ts
export const TimelinePlayActionSchema = z.object({
  type: z.literal('timeline.play'),
  timelineId: z.string()
})

export const AnimationPlayActionSchema = z.object({
  type: z.literal('animation.play'),
  entityId: z.string(),
  clip: z.string(),
  loop: z.boolean().optional(),
  fadeIn: z.number().optional(),
  fadeOut: z.number().optional()
})

export const FunctionCallActionSchema = z.object({
  type: z.literal('function.call'),
  name: z.string(),
  params: z.record(z.string(), z.unknown()).optional()
})
```

### 15.4 Reference validation

Zod 只能校验结构。引用检查需要单独工具：

```txt
1. entityId 是否存在
2. prefabId 是否存在
3. timelineId 是否存在
4. cameraShotId 是否存在
5. assetId 是否存在
6. animation clip 是否存在于 GLB metadata
7. action type 是否注册
8. condition type 是否注册
9. custom function name 是否在白名单
```

实现：

```txt
scripts/check-references.ts
src/data/ReferenceResolver.ts
```

---

## 16. Runtime Loop

### 16.1 主循环

```ts
let last = performance.now()

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 1 / 20)
  last = now

  input.update(dt)
  world.update(dt)
  eventSystem.update(dt)
  directorSystem.update(dt)
  animationSystem.update(dt)
  runtime.update(dt)
  runtime.render()

  requestAnimationFrame(frame)
}
```

### 16.2 更新顺序

推荐：

```txt
1. Input
2. Editor tools，如果 Edit Mode
3. Gameplay systems，如果 Play Mode
4. Trigger/Event systems
5. Action command flush
6. Director/Timeline
7. Animation bridge
8. Physics sync
9. Runtime update
10. Render
```

### 16.3 Mode 差异

```txt
Edit Mode:
  - 不跑 gameplay AI
  - 可跑 editor picking/gizmo
  - 可预览模型动画

Play Mode:
  - 跑 gameplay/event/director
  - editor 可只读或调试

Preview Mode:
  - 跑 director scrub
  - 不执行 runtimeOnly/destructive action
```

---

## 17. MVP 研发路线

### Phase 0：工程初始化

目标：可运行的 Vite + React + Three canvas。

任务：

```txt
1. 初始化 Vite + TypeScript + React
2. 配置 ESLint/Prettier
3. 安装 three、zod、vitest、playwright
4. 建立目录结构
5. 实现最小 WebRuntime interface
6. 实现 ThreeRuntime init/render/dispose
7. 加一条 import boundary lint 规则
```

验收：

```txt
npm run dev 可启动
npm run build 通过
npm run test 通过
页面显示一个 Three.js 场景
```

### Phase 1：数据层与加载

目标：能从 JSON 加载 prefab/level 并实例化 GLB。

任务：

```txt
1. 定义 common/entity/prefab/level schema
2. 实现 DataRepository
3. 实现 assets.manifest.json 加载
4. 实现 GLB 加载
5. 实现 entity → runtime object 实例化
6. 实现 transform 应用
7. 实现 validate-data CLI
```

验收：

```txt
加载 level_01.json 后场景出现实体
无效 JSON 会显示清晰错误
实体 transform 正确应用
```

### Phase 2：基础编辑器

目标：可视化选择、移动、旋转、缩放、保存。

任务：

```txt
1. HierarchyPanel
2. InspectorPanel
3. SelectionTool
4. ThreePicking
5. TransformControls 接入
6. TransformEntityCommand
7. Undo/Redo
8. Dev server save-json API
```

验收：

```txt
点击实体可选中
Gizmo 可移动/旋转/缩放
Inspector 显示 transform 和 components
保存后 level.json 更新
Undo/Redo 可用
```

### Phase 3：Event / Condition / Action

目标：开关触发 Timeline/Action。

任务：

```txt
1. event/trigger/condition/action schema
2. TriggerSystem
3. ConditionSystem
4. ActionSystem
5. actionRegistry
6. conditionRegistry
7. EventInspector 表单 MVP
8. entity.interact trigger
9. flag.set、timeline.play、animation.play、door.open action
```

验收：

```txt
玩家或测试按钮 interact switch_a
系统检查 condition
执行 actions
能设置 flag、开门、播放动画或 timeline
```

### Phase 4：Director / Timeline Runtime

目标：JSON timeline 可播放。

任务：

```txt
1. timeline schema
2. TimelinePlayer
3. action track
4. animation.play track
5. camera.shot track
6. property track MVP
7. seek/scrub/play/stop
8. timeline.finished trigger
```

验收：

```txt
tl_open_gate 播放时镜头移动、门动画播放、音效/flag action 触发
编辑器可拖动 timelineTime 预览 camera/animation
runtimeOnly action 在 scrub 中不执行
```

### Phase 5：Camera Shot Editor

目标：可制作简单运镜。

任务：

```txt
1. cameraShot schema
2. CameraShotPlayer
3. DirectorCameraSystem
4. CameraShotPanel
5. Set Key From View
6. View Through Camera
7. Look At Selected
8. camera shot preview
```

验收：

```txt
可创建 cam_gate_reveal
可添加/修改 keyframe
可从当前视角生成 keyframe
Timeline 播放时主相机跟随 Director Camera
```

### Phase 6：Timeline Editor

目标：底部时间轴可编辑 tracks/keyframes。

任务：

```txt
1. TimelinePanel UI
2. track list
3. time ruler
4. playhead
5. add/remove/move keyframe
6. add/remove track
7. edit action marker
8. save timeline.json
```

验收：

```txt
用户能在 UI 中创建 action marker、camera shot track、animation track
拖动 playhead 可 scrub
保存后 JSON 可被重新加载
```

### Phase 7：物理/触发器增强

目标：TriggerZone 和简单碰撞可靠。

任务：

```txt
1. Collider schema
2. TriggerZone visualization
3. AABB trigger MVP
4. 可选接 Rapier colliders/scene queries
5. Debug draw
```

验收：

```txt
玩家进入 trigger 后触发事件
编辑器可显示 trigger bounds
引用检查可发现 trigger target 缺失
```

---

## 18. AI 实施规范

### 18.1 每个模块实现前必须做

```txt
1. 阅读本架构文档对应章节
2. 确认是否允许 import three
3. 先写 schema/types
4. 再写 runtime/system
5. 再写 editor UI
6. 最后写 tests 和 demo data
```

### 18.2 AI 提交代码必须满足

```txt
1. npm run typecheck 通过
2. npm run lint 通过
3. npm run test 通过
4. npm run validate-data 通过
5. 不破坏 import boundary
6. 新增 JSON 数据必须有 schema
7. 新增 action/condition 必须注册 schema 和 registry
8. 新增 editor 表单必须保存到 JSON，而不是本地状态孤岛
```

### 18.3 不允许 AI 做的事

```txt
1. 在 JSON 中引入 eval/script/code 字段
2. 在 /src/game 中 import three
3. 把 THREE.Object3D 存进 EntityData
4. 把高频 transform 同步进 React state
5. 让 Timeline 真相只存在 UI 状态里
6. 在 scrub 时执行不可逆 action
7. 静默吞掉 schema 校验错误
8. 用 any 绕过核心数据类型
9. 写无法测试的全局单例黑盒
10. 直接修改 public/data 外的任意文件保存接口
```

### 18.4 适合交给 AI 的任务模板

```txt
请实现 Sinan Scene Director 的 [模块名]。
必须遵守：
- 不在 /src/game /src/events /src/director /src/world /src/schemas 中 import three
- 所有输入 JSON 先写 Zod schema
- 所有数据修改走 EditorCommand
- 所有 action/condition 走 registry
- 增加单元测试和 demo JSON
- 保持 npm run typecheck/lint/test/validate-data 通过

目标：
[具体功能]

验收：
[具体可测试结果]
```

---

## 19. 测试策略

### 19.1 单元测试

重点测试：

```txt
1. schema parse
2. condition evaluation
3. action registry dispatch
4. timeline sampling
5. camera shot interpolation
6. reference resolver
7. migration
8. undo/redo command
```

### 19.2 集成测试

重点测试：

```txt
1. 加载 level
2. interact switch
3. condition pass/fail
4. action sequence execution
5. timeline play/finish
6. camera shot applies pose
7. animation command reaches runtime mock
```

### 19.3 Playwright smoke test

```txt
1. 页面打开无 console error
2. canvas 存在
3. level 加载完成
4. 点击 entity 后 inspector 有 selected entity
5. 拖动 gizmo 后 transform 改变
6. 点击 Save 后 dev API 被调用
```

### 19.4 数据验证 CLI

`npm run validate-data` 必须执行：

```txt
1. JSON parse
2. Zod schema validation
3. cross-reference validation
4. duplicate id 检查
5. missing asset 检查
6. missing timeline/cameraShot/entity 检查
7. action/condition registry 检查
```

---

## 20. 性能指南

### 20.1 React

```txt
1. React 不存每帧 position/rotation
2. Inspector 只订阅 selected entity 的慢状态
3. Timeline playhead 可以节流到 30fps UI 显示，runtime 内部仍按 frame 更新
4. Canvas 内部渲染与 React UI 分离
5. 大型 entity list 做虚拟滚动
```

### 20.2 Three.js

```txt
1. GLB 资源缓存
2. 重复物件考虑 clone 或 InstancedMesh
3. 材质/几何体复用
4. dispose 时处理 geometry/material/texture
5. 避免每帧创建 Vector3/Quaternion 临时对象
6. picking 使用可选对象集合，不要全 scene 深遍历
7. 编辑器辅助对象与游戏对象分 layer
```

### 20.3 Timeline

```txt
1. Timeline track 预编译为可快速采样结构
2. action marker 用 sorted array + cursor，避免每帧全扫描
3. scrub 模式可重建 preview state
4. 长 timeline 分段缓存
```

### 20.4 数据

```txt
1. 大型 level 可按 chunk 分文件
2. prefab 与 asset manifest 分离
3. timeline/cameraShot 独立文件，避免 level.json 过大
4. 所有 id 使用稳定字符串，不使用数组 index 作为引用
```

---

## 21. Three.js → Babylon.js 迁移指南

### 21.1 可迁移前提

必须遵守：

```txt
1. Three 类型不泄漏到 game/events/director/world/data/schema
2. 所有 runtime 操作走 WebRuntime interface
3. 所有数据用中立 JSON 表达
4. 材质、动画、camera、gizmo 操作集中在 runtime adapter
```

### 21.2 未来需要重写的模块

```txt
/src/runtime/three/ThreeRuntime.ts
/src/runtime/three/ThreeAssetLoader.ts
/src/runtime/three/ThreeObjectRegistry.ts
/src/runtime/three/ThreePicking.ts
/src/runtime/three/ThreeTransformGizmo.ts
/src/runtime/three/ThreeAnimationRuntime.ts
/src/runtime/three/ThreeCameraRuntime.ts
/src/runtime/three/ThreeDisposal.ts
```

替换为：

```txt
/src/runtime/babylon/BabylonRuntime.ts
/src/runtime/babylon/BabylonAssetLoader.ts
/src/runtime/babylon/BabylonObjectRegistry.ts
/src/runtime/babylon/BabylonPicking.ts
/src/runtime/babylon/BabylonGizmo.ts
/src/runtime/babylon/BabylonAnimationRuntime.ts
/src/runtime/babylon/BabylonCameraRuntime.ts
/src/runtime/babylon/BabylonDisposal.ts
```

### 21.3 可保留的模块

```txt
/src/world
/src/events
/src/director，除非有 runtime 泄漏
/src/game
/src/schemas
/src/data
/src/migrations
/src/editor/panels
/data/*.json
/public/models/*.glb，大部分可保留
```

### 21.4 不要过度抽象

不要为了未来迁移写一个庞大通用引擎抽象。MVP 只抽象：

```txt
1. load/instantiate model
2. set/get transform
3. play/seek animation
4. set camera pose
5. pick
6. attach gizmo
7. update/render/dispose
```

---

## 22. 风险与应对

### 22.1 风险：编辑器范围膨胀

表现：想做完整 Unity。

应对：

```txt
只做项目专用编辑器。
材质、建模、复杂骨骼动画继续使用 Blender/Maya。
复杂曲线编辑可考虑 Theatre.js 或后期增强。
```

### 22.2 风险：JSON DSL 过度复杂

表现：Condition/Action/Timeline 变成另一个编程语言。

应对：

```txt
Action 类型小步增加。
所有 action 必须有 schema、registry、测试、editor form。
复杂逻辑放 TypeScript 白名单函数中，由 function.call 调用。
```

### 22.3 风险：scrub 与运行时副作用混乱

表现：拖时间轴导致永久改状态。

应对：

```txt
Action side effect 分类。
Preview state 与 runtime state 分离。
scrub 默认不执行 runtimeOnly/destructive action。
```

### 22.4 风险：Three.js 泄漏到所有层

表现：到处 `import * as THREE from 'three'`。

应对：

```txt
ESLint import boundary。
Code review 拒绝。
所有坐标用 Vec3/Quat 普通数组。
```

### 22.5 风险：React 变成游戏状态主存储

表现：每帧 setState，大量 re-render。

应对：

```txt
快状态在 World/runtime。
React 只显示慢状态和抽样状态。
Timeline UI 显示 playhead 可节流。
```

---

## 23. MVP Demo 场景建议

为了验证所有核心能力，第一版 demo 做一个小房间：

```txt
玩家出生在房间入口。
墙上有开关 switch_a。
门 gate_a 初始锁住。
玩家拾取 key 后，开关 condition 通过。
交互开关后播放 tl_open_gate。
tl_open_gate 中：
  - 锁定玩家控制
  - 播放 cam_gate_reveal 运镜
  - 播放 switch click 音效
  - 播放 gate_a Open 动画
  - NPC guard 播放 PointToGate 动画
  - 字幕显示“门开了。”
  - 设置 flag gate_a_opened = true
  - 恢复玩家控制和相机
```

这个 demo 能覆盖：

```txt
Entity placement
Interactable
Condition
Action
Timeline
Camera shot
Animation
Subtitle
Sound
Flag
Editor save/load
```

---

## 24. 第一批文件的实现顺序

建议实现 AI 按以下顺序创建文件：

```txt
1. src/schemas/common.schema.ts
2. src/schemas/transform.schema.ts
3. src/schemas/entity.schema.ts
4. src/schemas/prefab.schema.ts
5. src/schemas/level.schema.ts
6. src/runtime/WebRuntime.ts
7. src/runtime/RuntimeTypes.ts
8. src/runtime/three/ThreeRuntime.ts
9. src/data/DataRepository.ts
10. src/world/World.ts
11. src/editor/EditorApp.tsx
12. src/editor/Viewport.tsx
13. data/assets.manifest.json
14. data/prefabs/*.json
15. data/levels/level_01.json
16. scripts/validate-data.ts
```

然后再实现：

```txt
17. src/events/*
18. src/director/*
19. src/editor/panels/*
20. src/editor/tools/*
21. tests/*
```

---

## 25. 资料来源与官方文档参考

以下资料用于确认核心选型能力与约束。实现时应优先参考官方文档。

1. Three.js GLTFLoader：用于 glTF 2.0 / GLB 加载，返回 scene、scenes、cameras、animations 等，并支持多种 glTF 扩展。  
   https://threejs.org/docs/pages/GLTFLoader.html

2. Three.js AnimationMixer：用于播放特定对象的动画，支持 clipAction、setTime、update 等。  
   https://threejs.org/docs/pages/AnimationMixer.html

3. Three.js TransformControls：用于类似 Blender/DCC 的 3D 对象移动、旋转、缩放操作，支持 translate/rotate/scale、local/world、snap。  
   https://threejs.org/docs/pages/TransformControls.html

4. React Three Fiber performance pitfalls：说明 Three.js 有自己的 render loop，快速更新应在 useFrame 中 mutation，避免在循环中 setState。  
   https://r3f.docs.pmnd.rs/advanced/pitfalls

5. React Three Fiber hooks/useFrame：说明 useFrame 在 render loop 中执行，并提示不要在其中 setState。  
   https://r3f.docs.pmnd.rs/api/hooks

6. Zod：TypeScript-first schema validation with static type inference。  
   https://zod.dev/

7. Rapier JavaScript getting started：Rapier 提供 `@dimforge/rapier2d` / `@dimforge/rapier3d` NPM 包，WASM 需要异步加载。  
   https://rapier.rs/docs/user_guides/javascript/getting_started_js/

8. Theatre.js with THREE.js：Theatre.js 可与 Three.js 集成，用于 camera、light、material color 等属性动画，`@theatre/studio` 是编辑 GUI，`@theatre/core` 用于播放。  
   https://www.theatrejs.com/docs/0.5/getting-started/with-three-js

9. Theatre.js Sequences：提供 keyframe、sequence editor、曲线/属性动画等能力。  
   https://www.theatrejs.com/docs/latest/manual/sequences

10. Babylon.js Gizmos：Babylon.js 的 GizmoManager 可用于 position/rotation/scale/bounding box gizmo，作为未来 runtime 迁移参考。  
    https://doc.babylonjs.com/features/featuresDeepDive/mesh/gizmo

11. Babylon.js Inspector：Babylon.js inspector 是可视化调试工具，包含场景层级、属性面板、骨骼/物理等辅助工具，作为未来 runtime 迁移参考。  
    https://doc.babylonjs.com/legacy/inspector/

---

## 26. 最终结论

Sinan Scene Director 的核心不是 “Web 3D 编辑器”，而是：

```txt
AI 原生、文本数据驱动、可测试、可迁移的 3D 游戏导演系统。
```

Three.js 只是第一版 runtime。真正长期有价值的是：

```txt
Entity / Prefab / Level 数据模型
Event / Trigger / Condition / Action DSL
Timeline / Director / Camera Shot DSL
Editor Command / Undo / Save 架构
Schema / Validator / Migration 工具链
AI 可读写、可验证、可重构的项目边界
```

只要这些边界守住，项目可以快速由 AI 迭代；未来如果 Three.js 不够用，也可以迁移到 Babylon.js，而不必推翻事件、Timeline、关卡和编辑器数据体系。
