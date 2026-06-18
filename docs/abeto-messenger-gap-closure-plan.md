# Abeto Messenger-like Gap Closure Plan

> 日期: 2026-06-18
> 目标: 补齐 Sinan Scene Director 与 Abeto Messenger 类 Web 3D 风格化开放世界页游之间的效果和性能差距。
> 输入资料: `docs/abeto_messenger_technology_research.pdf`、Sinan 当前架构与 Phase 8-13 实现文档。
> 结论摘要: Sinan 当前架构可以承载这类项目, 但还需要新增风格化渲染管线、受控小世界系统、资产压缩/LOD/内存生命周期、游戏 runtime 与轻量多人能力。

## 1. 目标定义

本计划的目标不是把 Sinan 变成通用商业引擎, 也不是追求传统意义上的大型开放世界。更合理的目标是:

```txt
基于浏览器运行的 Three.js/WebGL 风格化 3D 页游
+ 小型球形或折叠式开放空间
+ 低贴图成本的统一美术风格
+ 轻量任务/探索/社交循环
+ 移动端可接受的性能预算
+ 数据驱动、AI 可维护、Git 友好的内容生产方式
```

Abeto Messenger 的核心经验不是某一个渲染技巧, 而是先用设计约束降低复杂度, 再用资产管线和 runtime 管线把 Web 端性能压住。因此 Sinan 的补齐方向也应遵循同样顺序:

1. 先限制世界规模、同屏复杂度和多人规模。
2. 再建立风格化资产规范。
3. 然后实现渲染/LOD/压缩/内存系统。
4. 最后扩展玩法、任务和轻量多人。

## 2. 当前 Sinan 基线

Sinan 当前已经具备的基础:

- `src/runtime/three/**` 内已有 Three.js runtime adapter。
- `ThreeRuntime` 已使用 `WebGLRenderer`、`GLTFLoader`、`AnimationMixer`、`TransformControls`。
- GLB 模型可从 `data/assets.manifest.json` 加载, 并支持缓存、clone、fallback placeholder。
- Timeline、Camera Shot、Action、Condition、Trigger、AABB debug、HUD/音频桥接已有基础。
- React 只负责编辑器慢状态, runtime 渲染和每帧状态在 Three/world/director 层。
- `check-boundaries` 已防止 Three.js 泄漏到 game/events/director/world/schema/data 层。
- `validate-data`、unit test、browser smoke 已覆盖核心数据和编辑器流程。

当前明显不足:

- demo 资产还是 blockout/development GLB, 不是最终美术资产。
- renderer 仍是朴素 forward Three.js 场景, 没有 toon/palette/outline/water/vegetation shader。
- 没有 Draco/KTX2/Basis 压缩资源管线。
- 没有 LOD 数据模型、LOD runtime 或批量实例化策略。
- 没有球形世界坐标、球面相机、地表法线/重力/移动系统。
- 没有 chunk streaming、显式资产引用计数和移动端内存预算。
- 没有完整玩家控制、任务系统、NPC、emoji/stamp、多人同步。

## 3. Messenger 参考能力拆解

根据调研文档, Messenger 的能力可以拆成以下工程层:

| 层级 | Messenger 做法 | 对 Sinan 的启发 |
| --- | --- | --- |
| 世界设计 | 小型球形星球, 城市/山地/海边压缩在同一空间 | 避免传统无限地形, 采用小型 compact open world |
| 美术策略 | 16x16 color atlas、toon/stylized shader、outline | 以统一色板和材质规范替代重 PBR 资产 |
| 资产生产 | Houdini/Blender、unwrapped cube、LOD、压缩 | 建立可验证的 Blender -> GLB -> manifest 流程 |
| 渲染管线 | Three.js/WebGL + custom shader + WebGL UI | 在 runtime adapter 中新增风格化 render features |
| 植被 | smart vegetation blobs -> 优化几何和 shader | 用 instancing/LOD/低面片植被替代高密草叶 |
| 性能 | 自定义 LOD、分批模型更新、主动内存回收 | 建立预算、加载生命周期和移动端降级策略 |
| UI | UI 直接绘制进 WebGL, Wasm glyph | 游戏 HUD 可走 WebGL layer, 编辑器 UI 继续 React |
| 多人 | 约 10 人房间, emoji/stamp 社交, 无文字聊天 | 轻量同步优先, 避免 MMO 复杂度 |

## 4. 差距矩阵

### 4.1 渲染效果差距

| 能力 | 当前 Sinan | 目标状态 | 差距 |
| --- | --- | --- | --- |
| 色彩风格 | 直接材质颜色和简单灯光 | 统一 palette/atlas 控制主色 | 缺 palette 材质与美术规范 |
| Toon shading | 未实现 | 支持 toon ramp、硬阴影感、低频色块 | 缺 shader/material 系统 |
| Outline | 未实现 | 支持角色/道具/交互物轮廓 | 缺 outline pass 或 inverted hull |
| 水体 | 未实现 | 海边/湖面支持渐变、岸边 ripple | 缺 water material 和 shoreline 数据 |
| 植被 | 未实现 | 低成本 grass/tree blobs + shader wind | 缺植被资产类型、instancing、LOD |
| 后处理 | 未实现 | 轻量 color grade、AA、可选 bloom/fog | 缺 EffectComposer 或自研 pass 策略 |
| WebGL HUD | 部分 DOM HUD | 游戏内 HUD 可渲染进 WebGL | 缺 text/glyph/sprite batching |

### 4.2 性能差距

| 能力 | 当前 Sinan | 目标状态 | 差距 |
| --- | --- | --- | --- |
| GLB 加载 | 已支持基础 GLB | 支持 Draco/meshopt 解码 | 缺压缩 loader 配置 |
| 纹理压缩 | 未支持 | KTX2/Basis GPU 压缩纹理 | 缺 KTX2Loader 与资源规范 |
| LOD | 未支持 | 每个可见资产支持 3-4 级 LOD | 缺 schema、editor、runtime 切换 |
| Instancing | 未支持 | 重复植被/石头/装饰使用 InstancedMesh | 缺批处理/实例数据模型 |
| Chunk | 未支持 | level 可按区域/chunk 加载卸载 | 缺 chunk 数据结构和生命周期 |
| BVH/空间查询 | AABB trigger MVP | three-mesh-bvh 或等价结构 | 缺 mesh query/collision acceleration |
| 内存生命周期 | 有 dispose 测试 | asset ref count、LRU、移动端主动释放 | 缺资产生命周期管理层 |
| 移动端降级 | 未系统化 | pixel ratio cap、LOD bias、特效开关 | 缺 device profile |

### 4.3 游戏体验差距

| 能力 | 当前 Sinan | 目标状态 | 差距 |
| --- | --- | --- | --- |
| 玩家控制 | 主要是编辑器视角和 marker | 球面地表移动、跳跃/坡面/交互 | 缺 gameplay controller |
| 任务系统 | Event/Action 可承载 | delivery jobs、路线、目标点、奖励 | 缺 quest/delivery schema |
| NPC/角色 | 动画桥接基础 | avatar、NPC idle/move/emote | 缺角色组件和动画状态机 |
| 社交 | 未实现 | 3D emoji/stamp, 低频同步 | 缺多人和社交 action |
| Showcase | 计划中 | 无编辑器干扰的可玩展示模式 | 缺 runtime-only app shell |

## 5. 关键原则

### 5.1 继续保持 Sinan 架构边界

补齐差距时不能破坏现有边界:

- `src/runtime/three/**` 拥有 Three.js 和 shader 实现。
- `src/game`、`src/events`、`src/director`、`src/world`、`src/schemas` 不 import `three`。
- 新增视觉能力通过 renderer-neutral schema 和 runtime adapter 暴露。
- 所有关卡、资产、LOD、chunk、任务、相机、timeline 仍以 JSON 为 source of truth。
- 编辑器保存必须继续走 command + validation。

### 5.2 先做 Messenger-like, 不做无限开放世界

目标世界规模建议:

```txt
第一版:
- 1 个小球形世界
- 4-6 个区域
- 5 个 delivery jobs
- 1 个玩家角色
- 8-12 个 NPC 或静态居民
- 10 人以内轻量在线房间
- 无文字聊天, 仅 emoji/stamp
```

这会显著降低:

- 远景渲染压力
- 地形 streaming 压力
- 多人同步压力
- 内容审核压力
- UI 复杂度
- 移动端显存压力

### 5.3 美术先制定预算, 再制作资产

每个资产进入 `data/assets.manifest.json` 前必须有预算信息:

```json
{
  "type": "model",
  "url": "/models/world/tree_a.glb",
  "metadata": {
    "category": "vegetation",
    "lodGroup": "tree_a",
    "maxTriangles": 800,
    "materialProfile": "palette-toon",
    "textureBudgetKb": 64,
    "instancing": true
  }
}
```

## 6. 新增系统设计

### 6.1 Stylized Material System

新增目标:

- 支持统一 palette/atlas。
- 支持 toon ramp。
- 支持 rim/edge tint。
- 支持交互对象 highlight。
- 支持平台降级。

建议文件:

```txt
src/schemas/renderStyle.schema.ts
src/runtime/RenderStyleTypes.ts
src/runtime/three/materials/PaletteToonMaterial.ts
src/runtime/three/materials/OutlineMaterial.ts
src/runtime/three/materials/WaterMaterial.ts
src/runtime/three/materials/VegetationMaterial.ts
src/runtime/three/ThreeMaterialRegistry.ts
```

数据示例:

```json
{
  "Renderable": {
    "model": "model.tree_a",
    "renderStyle": {
      "materialProfile": "palette-toon",
      "palette": "palette.world_01",
      "outline": "soft",
      "highlightGroup": "interactable"
    }
  }
}
```

验收:

- 同一 GLB 可以通过数据切换 `standard`、`palette-toon`、`vegetation`。
- 所有 material profile 有 schema 和 runtime fallback。
- 低端设备可以关闭 outline/水体 ripple/植被 wind。

### 6.2 Palette And Atlas Pipeline

新增目标:

- 建立 16x16 或等价小色板资源。
- GLB 材质不依赖大张 albedo。
- 色彩通过 vertex color、UV palette index 或材质参数控制。

建议文件:

```txt
data/palettes/world_01.json
public/textures/palettes/world_01.png
src/schemas/palette.schema.ts
src/data/PaletteValidator.ts
src/runtime/three/ThreePaletteTextureLoader.ts
```

验收:

- `validate-data` 能检查 palette 引用存在。
- 资产报告能输出每个 model 使用的材质 profile 和贴图预算。
- demo 世界看起来风格统一, 不依赖大贴图堆质量。

### 6.3 Outline And Highlight Pipeline

实现选项:

1. `OutlinePass` 或自定义 post pass。
2. inverted hull outline, 适合角色和重点道具。
3. mesh edge/normal based outline shader。

建议首选:

```txt
MVP: inverted hull 或材质替换式 outline, 易控且移动端成本低
后续: 需要全屏统一轮廓时再接 post pass
```

验收:

- 交互物、玩家、NPC 可有稳定轮廓。
- 选中态和游戏内可交互态能区分。
- outline 不影响 editor gizmo 和 debug helper。

### 6.4 Spherical World System

新增目标:

- 支持 unwrapped cube 工作流。
- 数据上仍保存可读的区域/局部坐标。
- runtime 中映射为球面位置和朝向。

建议数据:

```json
{
  "worldProjection": {
    "type": "cubeSphere",
    "radius": 18,
    "sourceLayout": "unwrapped-cube",
    "faces": ["north", "east", "south", "west", "top", "bottom"]
  }
}
```

建议文件:

```txt
src/schemas/worldProjection.schema.ts
src/world/SphericalWorld.ts
src/world/CubeSphereProjection.ts
src/game/SurfaceLocomotionSystem.ts
src/runtime/three/ThreeSphericalPlacementBridge.ts
```

验收:

- level entity 可以用局部坐标 authoring。
- runtime 能把局部坐标映射到球面。
- 玩家和相机沿球面移动时方向稳定。
- director camera shot 可以采样球面世界中的 lookAt/pose。

### 6.5 LOD System

新增目标:

- model asset 可声明多个 LOD。
- runtime 根据 camera distance、device profile、性能压力切换。
- editor 可以预览 LOD bounds 和切换距离。

建议数据:

```json
{
  "model.tree_a": {
    "type": "model",
    "url": "/models/vegetation/tree_a_lod0.glb",
    "metadata": {
      "lods": [
        { "distance": 0, "url": "/models/vegetation/tree_a_lod0.glb" },
        { "distance": 18, "url": "/models/vegetation/tree_a_lod1.glb" },
        { "distance": 35, "url": "/models/vegetation/tree_a_lod2.glb" },
        { "distance": 60, "mode": "billboard" }
      ]
    }
  }
}
```

建议文件:

```txt
src/schemas/lod.schema.ts
src/runtime/LodTypes.ts
src/runtime/three/ThreeLodRuntime.ts
src/runtime/three/ThreeBillboardRuntime.ts
src/data/LodBudgetValidator.ts
```

验收:

- 至少 4 级 LOD 可用于植被或建筑。
- LOD 切换避免明显 popping, 可使用 hysteresis。
- smoke 或 perf harness 能验证 LOD 随距离变化。

### 6.6 Instancing And Vegetation System

新增目标:

- 重复植被、石头、路灯等用实例批处理。
- authoring 仍使用 JSON 和 editor 工具。
- runtime 内部聚合为 InstancedMesh。

建议数据:

```json
{
  "id": "grass_patch_beach_01",
  "components": {
    "InstanceScatter": {
      "sourceModel": "model.grass_blade_a",
      "count": 250,
      "seed": 12051,
      "area": "area.beach_01",
      "surface": "world.surface"
    }
  }
}
```

建议文件:

```txt
src/schemas/instanceScatter.schema.ts
src/game/InstanceScatterSystem.ts
src/runtime/three/ThreeInstancingRuntime.ts
src/runtime/three/ThreeVegetationRuntime.ts
```

验收:

- 250-1000 个草/小石头在低 draw call 下显示。
- scatter 可由 seed 决定, 确保 Git 数据稳定。
- editor 可显示简化 preview 或 bounds, 不必逐个 entity 展开。

### 6.7 Asset Compression Pipeline

新增目标:

- 支持 Draco 或 meshopt 压缩模型。
- 支持 KTX2/Basis GPU 压缩纹理。
- 资源预算报告进入验证流程。

建议工具链:

```txt
Blender export GLB
-> gltf-transform optimize
-> meshopt/draco compression
-> texture resize/compress to KTX2
-> write/update manifest metadata
-> validate-data budget check
```

建议文件:

```txt
scripts/optimize-assets.ts
scripts/report-asset-budget.ts
src/runtime/three/ThreeCompressedAssetLoader.ts
src/data/AssetBudgetValidator.ts
```

验收:

- `npm run report-assets` 输出模型、纹理、动画、压缩状态和预算。
- 超预算资源会在 validation 中失败或至少 warning。
- Three runtime 能加载压缩后的生产资源。

### 6.8 Runtime Memory Lifecycle

新增目标:

- 每个 asset 有引用计数。
- chunk 卸载时释放未使用模型/纹理/材质。
- iOS Safari 和低内存设备有主动释放策略。

建议文件:

```txt
src/runtime/AssetLifetime.ts
src/runtime/RuntimeMemoryBudget.ts
src/runtime/three/ThreeTextureDisposal.ts
src/runtime/three/ThreeAssetRefCounter.ts
```

验收:

- 加载/卸载 chunk 后 renderer memory 不持续增长。
- smoke/perf test 能重复进入退出区域并检查对象数量。
- dispose 覆盖 geometry/material/texture/skeleton/action/mixer。

### 6.9 Chunk And Streaming System

新增目标:

- level 可拆成多个 chunk 文件。
- runtime 按 player/camera 所在区域加载附近 chunk。
- editor 可加载全部或局部。

建议数据:

```txt
data/levels/world_01.json
data/levels/world_01/chunks/city_core.json
data/levels/world_01/chunks/beach.json
data/levels/world_01/chunks/mountain.json
```

建议文件:

```txt
src/schemas/levelChunk.schema.ts
src/data/ChunkRepository.ts
src/world/ChunkSystem.ts
src/runtime/three/ThreeChunkRuntime.ts
```

验收:

- 初始加载只加载起始区域和邻近区域。
- 切换区域不会卡顿超过目标阈值。
- chunk 引用的 assets 可预加载和卸载。

### 6.10 Gameplay Runtime

新增目标:

- 从编辑器 demo 进入真正可玩 demo。
- 玩家可在球形世界移动、接任务、完成配送。
- emoji/stamp 作为社交最小闭环。

建议新增:

```txt
src/schemas/player.schema.ts
src/schemas/deliveryJob.schema.ts
src/schemas/npc.schema.ts
src/schemas/emote.schema.ts
src/game/PlayerControllerSystem.ts
src/game/DeliveryJobSystem.ts
src/game/NpcPresentationSystem.ts
src/game/EmoteSystem.ts
src/editor/ShowcaseApp.tsx
```

验收:

- Showcase Mode 打开后无编辑器面板。
- 玩家能移动、接取、送达、完成 1 个配送任务。
- NPC 和目标点有可读视觉反馈。
- emoji/stamp 能在本地 runtime 中显示。

### 6.11 Lightweight Multiplayer

新增目标:

- 最多 10 人房间。
- 同步位置、朝向、avatar 简化状态、emoji/stamp。
- 不同步编辑器状态和高频无关数据。

建议协议:

```txt
client -> server:
- joinRoom
- playerPose
- playEmote
- deliveryState

server -> clients:
- roomSnapshot
- playerJoined/playerLeft
- remotePose
- remoteEmote
- deliveryEvent
```

首版建议:

- 先做 local fake multiplayer simulator。
- 再接 WebSocket。
- 最后做 reconnect/interpolation/latency smoothing。

验收:

- 10 个 remote avatar mock 在本地渲染不明显掉帧。
- 网络消息 schema 可验证。
- emoji/stamp 不依赖文字聊天。

## 7. 性能预算

第一版 Messenger-like demo 推荐预算:

| 项目 | 桌面目标 | 移动目标 |
| --- | ---: | ---: |
| 首屏 JS gzip | <= 350 KB app + vendor split | <= 350 KB app + vendor split |
| 初始 3D 资源 | <= 8 MB compressed | <= 5 MB compressed |
| 总 demo 资源 | <= 25 MB compressed | <= 15 MB compressed |
| 同屏 draw calls | <= 180 | <= 100 |
| 同屏 triangles | <= 250k | <= 100k |
| 动态角色 | <= 10 players + 12 NPC | <= 6 players + 8 NPC |
| 纹理显存 | <= 128 MB | <= 64 MB |
| 帧率 | 60 fps target | 30 fps minimum |
| pixel ratio | 1.0-2.0 adaptive | 1.0-1.5 cap |

这些数字不是最终真理, 但必须有预算。没有预算就无法判断“能否做出这种性能”。

## 8. 推荐实施阶段

### Phase A: Stylized Rendering Foundation

目标: 建立 Messenger-like 视觉语言的最小管线。

任务:

- 新增 palette/toon material profile。
- 新增 outline/highlight。
- 新增轻量 fog/color grade。
- 新增 render style schema。
- 修改 demo 资产或生成器, 让 blockout 也能走 palette-toon。

验收:

- 当前 Gate Demo 不再像默认 Three.js blockout。
- 交互物、门、玩家 marker 有统一风格。
- 低端模式可关闭 outline。

### Phase B: Asset Budget And Compression

目标: 建立资产预算和生产资源加载能力。

任务:

- 扩展 asset manifest metadata。
- 增加 asset budget validator。
- 接入 Draco/meshopt 和 KTX2。
- 增加 asset report 脚本。

验收:

- 每个 model 有 triangle/material/texture/LOD 元数据。
- 超预算资源能被报告。
- 压缩 GLB/KTX2 能在 runtime 中加载。

### Phase C: LOD And Instancing

目标: 让重复物件和远景内容可控。

任务:

- 新增 LOD schema/runtime。
- 新增 InstancedMesh runtime。
- 新增 vegetation/scatter 数据。
- 在 demo 中加入草、树、石头或灯柱, 并证明 draw call 受控。

验收:

- 至少一个资产支持 3 级 LOD。
- 至少一个 scatter group 使用 instancing。
- 移动端或低端 profile 使用更激进的 LOD bias。

### Phase D: Spherical World Prototype

目标: 从房间 demo 过渡到小球形世界 demo。

任务:

- 新增 cubeSphere projection。
- 建立小球世界 blockout。
- 支持地表移动和球面相机。
- 支持区域/道路/目标点 authoring。

验收:

- 玩家能绕小球移动。
- 相机不会在极区或曲面移动时翻转。
- 3 个区域可读: 城市、山地、海边或等价区域。

### Phase E: Delivery Gameplay And Showcase

目标: 形成可玩的 Messenger-like demo。

任务:

- 新增 delivery job schema。
- 新增 player controller。
- 新增 interaction/route marker。
- 新增 Showcase Mode。
- 新增 1-2 个完整配送任务。

验收:

- 用户打开 Showcase Mode 可以直接玩。
- 任务开始、导航、交付、完成反馈完整。
- Editor Mode 仍可编辑任务数据。

### Phase F: Multiplayer-lite And Social Stamps

目标: 小规模共享空间。

任务:

- 先做 remote player simulator。
- 新增 avatar/emote/stamp schema。
- 新增 WebSocket room prototype。
- 限制房间人数和消息频率。

验收:

- 10 个玩家状态同步或模拟可运行。
- emoji/stamp 显示在 3D 世界中。
- 网络消息验证失败时不会破坏 runtime。

## 9. 验证与测试计划

新增验证命令建议:

```txt
npm run validate-data
npm run check-boundaries
npm run report-assets
npm run test
npm run test:smoke
npm run perf:smoke
```

新增 smoke 覆盖:

- stylized material 是否生效。
- outline/highlight 是否可见。
- LOD 是否随距离切换。
- InstancedMesh 是否限制 draw call。
- chunk load/unload 后无 console error。
- Showcase Mode 首屏非空且可移动。
- delivery job 可完成。
- 低端 profile 渲染不崩溃。

新增性能采样:

```txt
renderer.info.render.calls
renderer.info.render.triangles
renderer.info.memory.geometries
renderer.info.memory.textures
average frame time
95th percentile frame time
asset bytes loaded
active chunk count
```

## 10. 数据模型扩展清单

建议新增或扩展 schema:

```txt
src/schemas/renderStyle.schema.ts
src/schemas/palette.schema.ts
src/schemas/lod.schema.ts
src/schemas/worldProjection.schema.ts
src/schemas/levelChunk.schema.ts
src/schemas/instanceScatter.schema.ts
src/schemas/player.schema.ts
src/schemas/deliveryJob.schema.ts
src/schemas/avatar.schema.ts
src/schemas/emote.schema.ts
src/schemas/networkMessage.schema.ts
```

建议新增数据目录:

```txt
data/palettes/
data/worlds/
data/levels/world_01/chunks/
data/deliveryJobs/
data/emotes/
public/textures/palettes/
public/textures/compressed/
public/models/world/
public/models/vegetation/
public/models/avatars/
```

## 11. 风险与应对

| 风险 | 表现 | 应对 |
| --- | --- | --- |
| 目标膨胀成大型开放世界 | 需要无限地形、复杂 streaming、大量 NPC | 固定 tiny planet scope, 先做 5 个配送任务 |
| shader 侵蚀架构边界 | game/director 直接引用 Three material | 只通过 renderStyle schema 和 WebRuntime 扩展 |
| 美术资产过重 | 移动端加载慢、显存爆 | manifest budget + compression + LOD gate |
| Instancing 破坏编辑体验 | editor 无法选单个草/石头 | scatter group 作为 entity, 单实例不进入 hierarchy |
| 球形世界控制复杂 | 相机翻转、角色朝向错乱 | 先做 cubeSphere blockout, 再做美术 |
| 多人过早引入 | 网络问题拖慢单机玩法 | local simulator 先行, WebSocket 后接 |
| DOM UI 成本过高 | 游戏 HUD 频繁布局 | 编辑器继续 React, 游戏内 HUD 逐步迁到 WebGL/sprite |

## 12. 最小可行目标

建议第一个里程碑不要直接追完整 Messenger。更稳的目标是:

```txt
Sinan Messenger-like Vertical Slice

内容:
- 一个小球形世界 blockout
- 三个风格化区域
- 一个玩家角色
- 一个配送任务
- 一个 NPC 或邮箱目标
- 一套 palette-toon 材质
- outline/highlight
- 少量 instanced vegetation
- 3 级 LOD 示例
- Showcase Mode

性能:
- 桌面 60fps
- 移动端 30fps
- 初始资源 <= 8MB
- draw calls <= 150 桌面, <= 100 移动

架构:
- 所有新增数据走 schema
- Three.js 仍只在 runtime adapter
- validate-data/report-assets/test/smoke 全部通过
```

## 13. 推荐下一步

下一步建议创建新的 post-MVP 阶段:

```txt
Phase 16: Stylized Runtime Foundation
Phase 17: Asset Budget, Compression, And LOD
Phase 18: Compact Spherical World Prototype
Phase 19: Delivery Gameplay Showcase
Phase 20: Multiplayer-lite Social Layer
```

优先从 Phase 16 开始, 因为没有风格化 runtime, 后续资产和世界都会继续停留在 blockout 质感。Phase 16 的具体目标应是:

```txt
实现 Sinan 的 palette-toon render style、outline/highlight、基础 fog/color grade, 并让现有 Gate Demo 通过数据切换到风格化渲染。保持 Three.js 只在 runtime adapter 中, 增加 schema、tests、smoke 和文档。
```
