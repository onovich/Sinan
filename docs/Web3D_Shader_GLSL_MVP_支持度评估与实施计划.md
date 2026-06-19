# Web3D Shader GLSL MVP 支持度评估与实施计划

> 日期：2026-06-19
> 状态：Draft / 待执行
> 范围：只评估现有项目对 `docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md` 的支持度，并规划后续扩展；本计划不修改运行时代码。

## 1. 结论摘要

当前项目已经具备 Shader GLSL MVP 的几项重要前置条件：Three.js + Vite + TypeScript 技术栈已落地，`ThreeRuntime` 已集中在 `src/runtime/three/**`，`scripts/check-boundaries.ts` 已守住 renderer-neutral 层不直接依赖 Three.js 的边界，Timeline/Event/Action 也已经是数据驱动结构。

但当前项目还没有真正的 Shader 子系统。现有 `renderStyle` 和 `ThreeMaterialRegistry` 只支持把模型材质替换成 Three 内置材质（`MeshToonMaterial` / `MeshBasicMaterial` / 原始材质），更像美术风格替换层，不是方案要求的 `MaterialRuntime + MaterialDefinition + ShaderMaterial + .glsl` 运行时契约。

因此判断为：

```text
基础技术栈：可承接
架构边界：基本合格
材质公共契约：缺失
Shader 文件与导入：缺失
Timeline 材质参数：缺失
后处理运行时：缺失
Shader 测试体系：缺失
```

需要扩展，而且应按方案里的 S0-S4 分阶段扩展，不能直接从某个效果 shader 开始写。

## 2. 方案要点复述

已采纳的 Shader MVP 方案核心是：

- 自定义 Shader 使用标准 GLSL 和 `THREE.ShaderMaterial`。
- GLSL 保存在独立 `.glsl` 文件，通过 Vite `?raw` 导入。
- 不做自定义 Shader DSL、Godot-like 语法糖、Shader Graph、TSL、WGSL 或 GLSL 转译器。
- Timeline、Event、Editor、关卡数据只能访问公开材质参数，例如 `progress`，不得访问 `uProgress`。
- 材质公开参数由 `MaterialDefinition` 描述，运行时通过 `MaterialRuntime` 写入底层 Three material/uniform。
- 后处理只在需要时引入 `EffectComposer / ShaderPass / OutputPass`，并保证颜色空间只在最终输出阶段转换一次。
- 每个生产 Shader 必须有浏览器编译测试，关键效果要有视觉回归 fixture。

## 3. 当前项目支持度

| 能力项 | 当前支持度 | 现状 |
|---|---:|---|
| Three.js WebGLRenderer | 较高 | `src/runtime/three/ThreeRuntime.ts` 已创建 `THREE.WebGLRenderer`，设置 `outputColorSpace = THREE.SRGBColorSpace`。尚未显式设置 `renderer.debug.checkShaderErrors = true`，也未配置 `powerPreference`。 |
| Three 边界隔离 | 高 | `scripts/check-boundaries.ts` 已禁止 `src/events`、`src/director`、`src/schemas`、`src/data` 等中立层 import Three。 |
| 数据优先架构 | 高 | `data/**/*.json`、Zod schema、ReferenceResolver、validate-data 已形成数据源和校验链路。 |
| Vite raw asset 基础 | 中 | Vite 已可使用 `?raw` 能力，`tsconfig.app.json` 包含 `vite/client`。但项目内没有 `.glsl` 文件，也没有显式 `*.glsl?raw` 类型声明。 |
| 当前材质机制 | 低到中 | `RenderStyleSchema` 和 `ThreeMaterialRegistry` 能按 palette/toon/basic 替换材质并处理 dispose，但没有材质 ID、参数定义、slot、texture 参数、ShaderMaterial 工厂或 uniform 映射。 |
| 材质数据表达 | 低 | `Renderable` 仅有 `model` 和 `renderStyle`。没有 `materials: { slot: { materialId, parameters } }` 之类的材质引用数据。 |
| Timeline 参数能力 | 中 | `PropertyTrackPlayer` 已能按绝对时间采样 number/vec3，scrub 也是确定性的。它目前只是返回 `PropertyTrackSample`，没有写入 runtime，也不是材质参数契约。 |
| Action 接入 | 中 | `ActionRegistry` 有 preview/runtime side effect 分类，可扩展 `material.setParameter`。目前没有材质 action schema 和 handler。 |
| Texture 支持 | 低到中 | `AssetTypeSchema` 已包含 `texture` 和 `material`，但 `ThreeAssetLoader` 目前只加载 GLB 模型，没有 texture loader、colorSpace 元数据或引用计数。 |
| 后处理 | 低 | 现有 `ThreeEnvironmentStyle` 用 scene fog、renderer exposure 和 CSS filter 做环境样式，没有 `EffectComposer`、`RenderPass`、`OutputPass` 或 `ShaderPass`。 |
| Shader 测试 | 低 | Playwright/Vitest 已存在，但没有 shader compile test、visual fixture 或 `renderer.compileAsync` 测试。 |
| HMR / fallback | 低 | Vite HMR 基础存在，但没有材质热替换、旧材质保留、fallback error material、结构化 shader error。 |

## 4. 关键差距

### 4.1 `renderStyle` 不能直接等同于 `MaterialRuntime`

`renderStyle` 当前描述的是渲染风格：`standard`、`palette-toon`、outline、highlight、fog、colorGrade。它适合继续作为“整体视觉风格/装饰层”，但不适合承载 shader 参数。

原因：

- `renderStyle.profile` 是风格枚举，不是可扩展材质 ID。
- 当前 schema 没有参数类型、默认值、timeline 暴露策略。
- 当前 registry 每次按风格创建内置材质，缺少公开参数到 uniform 的稳定映射。
- Timeline 若复用 `property: "uProgress"` 会违反方案边界。

建议：保留 `renderStyle`，新增 `runtime/materials` 与 `Renderable.materials`，两者职责分离。

### 4.2 Timeline 需要专门的材质参数轨道

现有 `property` 轨道可复用“绝对时间采样”和插值算法，但不应把材质参数塞进 `property: "Material.uProgress"`。

建议新增：

```json
{
  "type": "material.parameter",
  "target": {
    "entityId": "gate_a",
    "slot": "main"
  },
  "parameter": "progress",
  "keys": [
    { "time": 0, "value": 0 },
    { "time": 2, "value": 1 }
  ]
}
```

运行路径应为：

```text
DirectorSystem
  -> MaterialParameterTrackPlayer
  -> MaterialRuntime.setParameter()
  -> ThreeMaterialRuntime
  -> ShaderMaterial.uniforms.uProgress.value
```

### 4.3 Texture 资源管线必须先补齐

第一批 dissolve shader 通常需要 noise/mask texture。当前 manifest schema 已允许 `texture`，但 runtime loader 只管模型。需要新增 texture loader，并在 metadata 中表达 colorSpace：

```json
{
  "texture.noise_01": {
    "type": "texture",
    "url": "/textures/noise_01.png",
    "metadata": {
      "colorSpace": "data"
    }
  }
}
```

规则：

- 颜色贴图 -> `THREE.SRGBColorSpace`
- 数据贴图、noise、mask -> `THREE.NoColorSpace`

### 4.4 后处理不应复用 CSS filter

当前 `colorGrade` 使用 renderer exposure 和 DOM CSS filter，适合作为编辑器/风格 MVP 的轻量方案，但不满足 Shader 后处理方案的可测性和颜色空间要求。S3 阶段需要引入真正的 `EffectComposer` 链路，并明确 CSS filter 与 postprocessing 的边界或迁移策略。

## 5. 推荐扩展架构

### 5.1 新增中立材质契约层

建议新增：

```text
src/runtime/materials/
  MaterialDefinition.ts
  MaterialParameter.ts
  MaterialRegistry.ts
  MaterialRuntime.ts
```

职责：

- 定义 `MaterialParameterValue`、`MaterialParameterDefinition`、`MaterialDefinition`。
- 维护材质 ID、版本、参数默认值、timeline 暴露策略。
- 对外提供 renderer-neutral `MaterialRuntime`，不暴露 Three 类型。

### 5.2 新增 Three 材质后端

建议新增：

```text
src/runtime/three/materials/
  ThreeMaterialRuntime.ts
  ThreeMaterialFactory.ts
  createFallbackMaterial.ts
  builtins/
  shaders/
```

职责：

- 根据材质 ID 创建 `THREE.ShaderMaterial` 或内置材质。
- 管理 entity/slot 到 material instance 的绑定。
- 负责公开参数到 uniform 的映射。
- 负责材质 clone/share/dispose。
- 记录结构化错误并提供 fallback material。

`ThreeMaterialRegistry` 可被复用的经验：

- 保存原始材质后再替换。
- 替换材质前 dispose 旧的被替换材质。
- 对 GLB clone 后的 mesh 批量遍历。

不建议直接把 `ThreeMaterialRegistry` 扩成 ShaderRuntime，因为它当前服务的是 `renderStyle`，职责不同。

### 5.3 新增 Shader 源码目录

建议新增：

```text
src/shaders/
  materials/
    dissolve/
      dissolve.vert.glsl
      dissolve.frag.glsl
  postprocessing/
```

并新增显式声明：

```text
src/vite-env.d.ts
```

声明 `*.glsl?raw`，避免 TS 对非标准扩展的支持依赖隐式行为。

### 5.4 扩展数据 schema

建议在 `Renderable` 中新增材质槽，而不是替换 `renderStyle`：

```json
{
  "Renderable": {
    "model": "model.door_wood",
    "renderStyle": {
      "profile": "palette-toon"
    },
    "materials": {
      "main": {
        "materialId": "dissolve",
        "parameters": {
          "progress": 0,
          "edgeWidth": 0.08,
          "noiseMap": "texture.noise_01"
        }
      }
    }
  }
}
```

短期可默认 `main` slot 应用到所有 mesh。后续若 GLB 有多个 material slot，再新增 slot 匹配规则。

### 5.5 扩展 Event/Timeline

建议新增：

- `MaterialSetParameterActionSchema`
- `MaterialParameterTimelineTrackSchema`
- `MaterialParameterTrackPlayer`
- `ReferenceResolver` 对 materialId、parameter、texture asset 的校验

Action 示例：

```json
{
  "type": "material.setParameter",
  "target": {
    "entityId": "gate_a",
    "slot": "main"
  },
  "parameter": "edgeColor",
  "value": "#ff0000"
}
```

## 6. 分阶段实施计划

### S0：Shader 基础设施

目标：先让一个最小 ShaderMaterial 能被注册、应用、编译、销毁；不追求效果复杂度。

任务：

- 新增 `src/runtime/materials/**` 中立接口。
- 新增 `src/runtime/three/materials/**` Three 后端。
- 新增 `.glsl?raw` 类型声明和 `src/shaders/**` 目录。
- 新增 `MaterialDefinition`、`MaterialRegistry`、`MaterialRuntime`。
- 新增 fallback error material。
- 扩展 `Renderable` schema 支持 `materials`。
- 扩展 `ReferenceResolver` 校验 materialId、parameter、texture asset。
- 新增最小 shader compile Playwright 测试，使用真实 Chromium 和 `renderer.compileAsync(scene, camera)`。
- 显式打开 `renderer.debug.checkShaderErrors`，并评估是否把 `three` 版本从 caret 改为精确版本。

验收：

- 一个测试 shader 可从 `.glsl` 文件导入并创建 `THREE.ShaderMaterial`。
- 关卡 JSON 可通过公开 materialId/parameter 引用材质。
- 编译失败能让测试失败并输出可定位日志。
- `src/director`、`src/events`、`src/schemas`、`src/data` 仍不 import Three。

建议验证命令：

```text
npm run typecheck
npm run lint
npm run test
npm run validate-data
npm run test:smoke
```

### S1：首个剧情材质 dissolve

目标：让 `gate_a` 可以通过 Timeline 确定性控制 dissolve progress。

任务：

- 新增 `dissolve.vert.glsl`、`dissolve.frag.glsl`。
- 新增 `createDissolveMaterial.ts` 与 `dissolveDefinition`。
- 新增 noise texture asset 和 colorSpace metadata。
- 新增 `material.parameter` timeline track。
- 新增 `MaterialParameterTrackPlayer`，支持 number/color/vec2/vec3 插值和 boolean/texture 离散切换。
- 新增 `material.setParameter` action。
- 编辑器 Inspector 显示 MaterialDefinition 公开参数。
- 给 `tl_open_gate` 增加可选 dissolve 参数轨道，替代或并行当前 `Door.openAmount` 演示。
- 新增 dissolve visual fixture。

验收：

- Timeline scrub 到任意时间，`progress` 都由绝对时间采样得出。
- 事件和 Timeline 不引用 `uProgress`。
- 刷新页面后材质参数来自 JSON，预览一致。
- dissolve shader 有浏览器编译测试和至少一张视觉基线。

### S2：全局参数与第二个材质

目标：建立可复用 shader 运行时能力，而不是只服务 dissolve。

任务：

- 新增 `ShaderGlobals`，由 `ThreeMaterialRuntime.updateGlobals()` 统一维护 `uTime`、`uDeltaTime`、viewport、player position 等。
- 新增 hologram 或 scanline shader。
- 明确材质共享/克隆策略：静态共享，剧情参数独立克隆，大量对象评估 instancing。
- 新增资源释放测试，观察 `renderer.info.memory` 和 `renderer.info.programs`。

验收：

- 全局时间只有一个更新源。
- 材质参数更新不在每帧创建临时 Color/Vector。
- 重复加载/卸载场景后 GPU 资源不持续线性增长。

### S3：后处理

目标：引入真正可 Timeline 驱动的 postprocessing 链路。

任务：

- 新增 `ThreePostProcessRuntime`。
- 接入 `EffectComposer`、`RenderPass`、`OutputPass`。
- 增加至少一个效果，例如 vignette 或全屏 flash。
- 新增 `postprocess.parameter` timeline track。
- 梳理现有 `ThreeEnvironmentStyle.colorGrade` 与后处理链的边界，避免 CSS filter 与 OutputPass 产生重复色彩处理。

验收：

- 后处理链只有最终输出点做 tone mapping / colorSpace 转换。
- Pass 支持 enable/disable，禁用后不继续分配或更新资源。
- Timeline 可以渐入/渐出一个后处理参数。

### S4：生产质量

目标：让 Shader 子系统可长期维护。

任务：

- 所有生产 shader 全量浏览器编译测试。
- P0/P1 效果视觉回归。
- HMR 材质热替换策略：保留旧材质或 fallback，不让编辑器白屏。
- shader error 结构化日志：materialId、stage、源路径、Three 版本、GPU/browser 信息。
- 移动设备性能基线。
- 关卡开始前预编译策略。

验收：

- MVP checklist 全部通过。
- 新增生产 shader 必须同时提交 GLSL、工厂、MaterialDefinition、注册、编译测试、视觉 fixture、必要 Timeline 测试。

## 7. 不建议的捷径

- 不建议把 shader 类型塞进现有 `renderStyle.profile`。这会混淆风格装饰和材质运行时契约。
- 不建议用现有 `property` track 直接写 `uProgress`。这会把 GLSL uniform 泄漏进 Timeline 数据。
- 不建议先写 dissolve fragment shader 再补架构。第一颗 shader 必须验证完整链路。
- 不建议现在引入 glslify、Shader Graph、TSL、WGSL 或 Godot-like 语法糖。
- 不建议用 CSS filter 代替需要测试和颜色空间控制的后处理 Pass。

## 8. 推荐优先级

```text
P0：MaterialRuntime / MaterialDefinition / .glsl import / compile test
P0：Renderable materials schema 与 ReferenceResolver 校验
P0：dissolve + material.parameter timeline track
P1：texture loader 与 colorSpace metadata
P1：MaterialInspector MVP
P1：视觉回归 fixture
P2：global shader uniforms 与第二个材质
P2：postprocessing runtime
P3：HMR 热替换、错误遥测、移动端性能基线
```

## 9. 第一轮建议执行包

第一轮不要超过 S0，建议拆成一个可合并的小包：

1. 新增中立材质类型与 registry。
2. 新增 Three material runtime 骨架和 fallback material。
3. 新增 `.glsl?raw` 声明与一个最小 test shader。
4. 新增 browser compile test。
5. 扩展 schema/validator，但 demo 数据可以只放测试 fixture，不急于改正式关卡。

这一轮完成后，再进入 S1 dissolve。这样可以先证明“标准 GLSL + Three ShaderMaterial + 数据契约 + 真实浏览器编译测试”这条链路成立。
