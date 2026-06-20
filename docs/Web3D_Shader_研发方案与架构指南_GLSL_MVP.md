# Sinan Engine：Shader 研发方案与架构指南

> 文档状态：**Accepted / 已采纳**
> 版本：**1.0.0**
> 日期：**2026-06-18**
> 适用阶段：**MVP 至首个可发布版本**
> 目标读者：负责实现本项目的 AI coding agent、技术负责人、渲染开发者、工具开发者

---

## 0. 一页决策摘要

本项目当前采用以下 Shader 技术方案：

```text
渲染器：Three.js WebGLRenderer
底层图形能力：WebGL 2
自定义 Shader 语言：GLSL
材质入口：THREE.ShaderMaterial
构建工具：Vite，通过 ?raw 导入 .glsl 文件
后处理：Three.js EffectComposer / ShaderPass（按需启用）
运行时控制：MaterialRuntime
Timeline 接入：通过公开材质参数，不直接访问 GLSL uniform
```

MVP **明确不做**：

```text
自定义 Shader 语言或私有 DSL
Godot 风格 Shader 语法糖
Shader Graph
GLSL → WGSL 转译器
自定义 GLSL 解析器
自动生成 WGSL
TSL 生产管线
WebGPU Shader
RawShaderMaterial 常规使用
散落在业务代码中的 onBeforeCompile 补丁
```

核心理由：项目主要由 AI 完成开发。标准 GLSL、Three.js 和 TypeScript 拥有更成熟的知识、示例与调试路径；私有语法会降低 AI 的先验能力，并把项目拖入编译器、语言服务、错误映射和多后端生成等非核心工作。

---

## 1. 决策目标

Shader 方案必须满足以下目标，按优先级排序：

1. **AI 易实现、易修复**：尽量使用标准语言和公开 API。
2. **反馈回路短**：保存后可立即热更新、编译、预览和截图测试。
3. **运行时边界清晰**：游戏逻辑、事件系统和 Timeline 不依赖 Three.js 材质内部结构。
4. **可测试**：每个 Shader 都能自动编译，并能做视觉回归测试。
5. **可维护**：Shader 源码、材质工厂、参数定义和测试位于明确目录。
6. **可迁移**：未来转向 Three.js TSL/WebGPURenderer 或 Babylon.js/WGSL 时，不重写事件、Timeline 和关卡数据。
7. **不过度建设**：MVP 不研发 Shader 编译器、Shader Graph 或完整材质编辑器。

---

## 2. 技术基线

### 2.1 Three.js WebGLRenderer

MVP 使用 `THREE.WebGLRenderer`。当前 Three.js 的 `WebGLRenderer` 以 WebGL 2 为运行基础；项目不承担 WebGL 1 兼容工作。

推荐初始化：

```ts
import * as THREE from "three";

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.debug.checkShaderErrors = true;

  return renderer;
}
```

注意：

- `renderer.debug.checkShaderErrors` 在开发环境必须开启。
- 不得因为错误日志“太多”而静默关闭 Shader 编译检查。
- Three.js 版本必须在 `package.json` 和锁文件中固定，不得在 CI 中使用不受控的 `latest`。

### 2.2 ShaderMaterial

自定义物体材质默认使用 `THREE.ShaderMaterial`。

选择原因：

- Three.js 自动提供常用 attribute、uniform 和矩阵，例如 `position`、`normal`、`uv`、`modelMatrix`、`modelViewMatrix`、`projectionMatrix`、`normalMatrix` 和 `cameraPosition`。
- Uniform 通过标准 Three.js API 管理。
- 可使用 Three.js 官方 Shader chunk 完成色彩空间、tone mapping 等必要处理。
- 比 `RawShaderMaterial` 更少样板代码，更适合 AI 快速实现和诊断。

`RawShaderMaterial` 仅在以下条件全部满足时允许使用：

1. `ShaderMaterial` 确实无法满足需求；
2. 有一份单独 ADR 解释原因；
3. 有浏览器编译测试和视觉回归测试；
4. 明确列出自行维护的全部 attribute、uniform、矩阵和输出转换。

### 2.3 GLSL 源码风格

MVP 中不显式设置 `glslVersion`，采用 Three.js `ShaderMaterial` 官方常见源码风格：

```glsl
varying vec2 vUv;
uniform sampler2D uMap;

void main() {
    vec4 color = texture2D(uMap, vUv);
    gl_FragColor = color;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
```

这样做的原因：

- 与 Three.js 大量官方示例和 Shader chunk 的使用方式一致；
- AI 对 `varying`、`texture2D`、`gl_FragColor` 形式通常更熟悉；
- 避免在 MVP 同时维护显式 GLSL 3 输出声明与 Three.js chunk 兼容细节；
- 底层仍由现代 WebGL 2 执行。

禁止在同一 Shader 中混合两种风格，例如同时出现：

```glsl
varying vec2 vUv;
in vec2 vUv;
```

显式 `THREE.GLSL3` 可在未来逐 Shader 评估，但不作为 MVP 默认规范。

---

## 3. 选型原因

### 3.1 为什么当前选 GLSL

GLSL 是 WebGL Shader 的标准编程语言，AI 对以下内容拥有大量成熟知识：

- vertex shader 与 fragment shader；
- 向量、矩阵、纹理采样；
- UV、法线、世界空间与视图空间；
- 噪声、溶解、Fresnel、扫描线、全息、描边等常见效果；
- Three.js `ShaderMaterial` 接入；
- 浏览器端编译错误和图形调试。

相较私有 DSL，GLSL 的优势不是语法最短，而是：

```text
标准化
资料多
AI 先验强
错误可搜索
可直接运行
无需维护编译器
```

### 3.2 为什么现在不做 Godot 风格语法糖

Godot 的 Shader 体验值得借鉴，但其便利性建立在完整引擎材质管线、Inspector、内建语义变量和编译系统之上。若本项目现在模仿这些能力，需要同时解决：

- 自定义解析；
- 参数提示语法；
- 类型检查；
- 源码位置映射；
- 编译错误映射；
- 编辑器控件生成；
- 渲染状态生成；
- GLSL/WGSL 多后端；
- IDE 高亮、补全与格式化。

这些工作不会直接提高当前游戏内容生产速度，反而会降低 AI 使用标准 GLSL 的优势。

因此当前决策是：

> **先收集真实 Shader 制作痛点，后续再决定是否添加薄语法糖；不得预先研发一门语言。**

### 3.3 为什么现在不选 TSL

TSL 是 Three.js 面向 Node Material、WebGPU/WebGL 多后端的长期方向，但本项目当前优先级是稳定、直接和 AI 高熟悉度。

现阶段不选 TSL 的原因：

- 项目尚未确认需要 WebGPU；
- Shader 数量和复杂度还未知；
- 标准 GLSL 对 AI 更透明；
- `WebGPURenderer` 的整体迁移还涉及材质、后处理和运行时，而不只是改写 Shader；
- 过早使用 TSL 会让渲染架构选择先于产品需求。

未来迁移章节会保留 TSL 路线，但它不是 MVP 内容。

### 3.4 为什么现在不选 WGSL

WGSL 属于 WebGPU Shader 路线。MVP 使用 Three.js `WebGLRenderer`，因此直接使用 WGSL 会引入不必要的双渲染后端或整体迁移工作。

### 3.5 为什么不默认使用 onBeforeCompile

`onBeforeCompile()` 可以修改 Three.js 内置材质 Shader，但补丁通常依赖内部 Shader chunk 和字符串替换位置，升级 Three.js 时更脆弱，而且未来 `WebGPURenderer` 不支持这一迁移方式。

规则：

- 内置 PBR 材质能满足需求时，直接使用内置材质。
- 自定义非 PBR 特效使用 `ShaderMaterial`。
- MVP 尽量不做“内置 PBR + 大量字符串补丁”。
- 确需 `onBeforeCompile` 时，只能位于 `/runtime/three/material-patches/`，必须单独测试，不得散落在组件或业务系统中。

---

## 4. 材质策略

所有可渲染对象的材质按以下顺序选择：

### 4.1 第一优先级：Three.js 内置材质

常见选择：

```text
MeshStandardMaterial
MeshPhysicalMaterial
MeshBasicMaterial
MeshLambertMaterial
MeshToonMaterial
PointsMaterial
SpriteMaterial
```

以下效果不应立即写自定义 Shader：

- 基础 PBR；
- 金属度、粗糙度；
- 普通贴图；
- 透明度；
- emissive；
- 环境贴图；
- 基础 toon；
- 常规颜色变化。

原则：

> **Shader 是在内置材质不足时使用的工具，不是所有材质的默认实现。**

### 4.2 第二优先级：ShaderMaterial

适合：

- 溶解；
- 全息；
- 扫描线；
- 传送门；
- 能量罩；
- 风吹顶点；
- 特殊 UV 动画；
- 受击闪白；
- 项目专用非真实感效果；
- 特殊透明与遮罩；
- 自定义 Points/粒子外观。

### 4.3 第三优先级：后处理

适合：

- vignette；
- bloom；
- 色差；
- 故障效果；
- 全屏闪白；
- 低血量效果；
- cutscene 黑边；
- 景深、模糊和屏幕滤镜。

优先使用 Three.js 已有 Pass；只有已有 Pass 不满足时才写自定义 `ShaderPass`。

---

## 5. 项目目录结构

```text
src/
  runtime/
    materials/
      MaterialRuntime.ts
      MaterialDefinition.ts
      MaterialRegistry.ts
      MaterialParameter.ts

    three/
      materials/
        ThreeMaterialRuntime.ts
        ThreeMaterialFactory.ts
        createFallbackMaterial.ts

        builtins/
          createStandardMaterial.ts
          createPhysicalMaterial.ts

        shaders/
          dissolve/
            createDissolveMaterial.ts
          hologram/
            createHologramMaterial.ts

      postprocessing/
        ThreePostProcessRuntime.ts
        createComposer.ts
        passes/

  shaders/
    materials/
      dissolve/
        dissolve.vert.glsl
        dissolve.frag.glsl
      hologram/
        hologram.vert.glsl
        hologram.frag.glsl

    postprocessing/
      vignette/
        vignette.vert.glsl
        vignette.frag.glsl

  editor/
    materials/
      MaterialInspector.tsx
      MaterialPreview.tsx

  director/
    tracks/
      MaterialParameterTrack.ts
      PostProcessParameterTrack.ts

  schemas/
    material.schema.ts
    timeline-material-track.schema.ts

tests/
  shaders/
    shader-compile.spec.ts
    shader-visual.spec.ts
    shader-timeline.spec.ts
```

规则：

- `.glsl` 文件只包含 GLSL。
- `.ts` 文件负责创建材质、提供默认参数和转换外部数据。
- 禁止把大段 GLSL 写在 TypeScript 模板字符串中。
- 禁止在关卡 JSON、Timeline JSON 或 prefab JSON 中内联 Shader 源码。

---

## 6. Shader 文件导入

使用 Vite `?raw` 将 GLSL 文件作为字符串导入：

```ts
import vertexShader from "@/shaders/materials/dissolve/dissolve.vert.glsl?raw";
import fragmentShader from "@/shaders/materials/dissolve/dissolve.frag.glsl?raw";
```

添加 TypeScript 声明：

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />

declare module "*.glsl?raw" {
  const source: string;
  export default source;
}
```

MVP 不实现自定义 `#include` 解析器。

允许使用 Three.js 自带 Shader chunk，例如：

```glsl
#include <tonemapping_fragment>
#include <colorspace_fragment>
```

若未来出现大量公共函数重复，再单独评估 glslify、构建期拼接或项目级 include；在真实需求出现前不建设。

---

## 7. Shader 编码规范

### 7.1 命名

| 类型 | 前缀/风格 | 示例 |
|---|---|---|
| Uniform | `u` + PascalCase | `uTime`, `uProgress`, `uEdgeColor` |
| Varying | `v` + PascalCase | `vUv`, `vWorldPosition` |
| 自定义 Attribute | `a` + PascalCase | `aInstancePhase` |
| 局部变量 | camelCase | `edgeFactor`, `worldNormal` |
| 宏 | UPPER_SNAKE_CASE | `USE_NOISE`, `MAX_LIGHTS` |
| 函数 | camelCase | `sampleNoise()`, `computeFresnel()` |

不要给 Three.js 内置属性重新加前缀：

```glsl
position
normal
uv
modelMatrix
modelViewMatrix
projectionMatrix
normalMatrix
cameraPosition
```

### 7.2 精度

优先依赖 `ShaderMaterial` 注入的精度声明，不在每个 Shader 重复写：

```glsl
precision highp float;
```

只有确有独立编译需求时才显式声明。

### 7.3 时间单位

- 所有时间 uniform 统一使用**秒**。
- `uTime`：自应用启动以来的连续秒数，可在编辑模式中暂停。
- `uDeltaTime`：当前帧秒数，必须做上限截断。
- Timeline Shader 参数优先使用 Timeline 自身采样值，不依赖 `uTime` 推导关键剧情状态。

### 7.4 坐标空间

变量名称必须包含空间语义：

```text
localPosition
worldPosition
viewPosition
localNormal
worldNormal
viewNormal
```

禁止使用含义不明的：

```text
pos
p
n
normal2
```

短循环变量除外。

### 7.5 颜色空间

项目工作颜色空间遵循 Three.js 的 Linear-sRGB 工作流：

- Shader 内的照明、混合和插值在 Linear-sRGB 中处理。
- CSS/十六进制颜色通过 `THREE.Color` 转换后传入。
- PNG/JPEG 等颜色纹理设置为 `THREE.SRGBColorSpace`。
- normal、roughness、metalness、mask、noise 等数据纹理保持 `THREE.NoColorSpace`。
- 直接输出到屏幕的 `ShaderMaterial` fragment shader 结尾必须完成输出色彩空间转换。

常规结尾：

```glsl
gl_FragColor = vec4(finalColor, alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
```

使用后处理链时，最终色彩空间与 tone mapping 由统一输出 Pass 负责；不得在链路中重复转换。每个后处理 Pass 必须注明输入和输出所处颜色空间。

### 7.6 动态值使用 Uniform，不使用动态 Define

`defines` 仅用于创建时不变的 Shader 变体：

```ts
defines: {
  USE_NOISE: 1,
}
```

禁止每帧或 Timeline 中切换 define，因为这会导致程序重新编译。

动态状态使用 uniform：

```glsl
uniform float uNoiseEnabled;
```

### 7.7 分支与循环

- 优先可读性，不为“可能的性能”写晦涩代码。
- 大循环必须有常量上限。
- 不允许由不受控外部数据决定无限或超大循环。
- 性能优化必须基于 GPU profile、帧时间或真实场景数据。

### 7.8 透明材质

透明材质必须显式说明：

```ts
transparent: true,
depthWrite: false,
depthTest: true,
```

但这些值不能盲目复制；应根据效果验证。

优先顺序：

1. 纯不透明；
2. `alphaTest`/遮罩；
3. 只有确需半透明时使用 alpha blending。

原因是透明对象通常涉及排序、overdraw 和深度问题。

---

## 8. 标准 Shader 示例

### 8.1 Vertex Shader

```glsl
// dissolve.vert.glsl

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
```

也可使用更直接的：

```glsl
gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
```

### 8.2 Fragment Shader

```glsl
// dissolve.frag.glsl

uniform float uProgress;
uniform float uEdgeWidth;
uniform vec3 uBaseColor;
uniform vec3 uEdgeColor;
uniform sampler2D uNoiseMap;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    float noiseValue = texture2D(uNoiseMap, vUv).r;

    if (noiseValue < uProgress) {
        discard;
    }

    float edge = smoothstep(
        uProgress,
        uProgress + max(uEdgeWidth, 0.0001),
        noiseValue
    );

    vec3 finalColor = mix(uEdgeColor, uBaseColor, edge);

    gl_FragColor = vec4(finalColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
```

### 8.3 TypeScript 材质工厂

```ts
import * as THREE from "three";

import vertexShader from "@/shaders/materials/dissolve/dissolve.vert.glsl?raw";
import fragmentShader from "@/shaders/materials/dissolve/dissolve.frag.glsl?raw";

export interface DissolveMaterialOptions {
  noiseMap: THREE.Texture;
  progress?: number;
  edgeWidth?: number;
  baseColor?: THREE.ColorRepresentation;
  edgeColor?: THREE.ColorRepresentation;
}

export function createDissolveMaterial(
  options: DissolveMaterialOptions,
): THREE.ShaderMaterial {
  if (!options.noiseMap) {
    throw new Error("createDissolveMaterial requires noiseMap");
  }

  const material = new THREE.ShaderMaterial({
    name: "material:dissolve",
    vertexShader,
    fragmentShader,
    uniforms: {
      uProgress: { value: options.progress ?? 0 },
      uEdgeWidth: { value: options.edgeWidth ?? 0.08 },
      uBaseColor: {
        value: new THREE.Color(options.baseColor ?? 0xcccccc),
      },
      uEdgeColor: {
        value: new THREE.Color(options.edgeColor ?? 0xffa040),
      },
      uNoiseMap: { value: options.noiseMap },
    },
    transparent: false,
    depthTest: true,
    depthWrite: true,
    toneMapped: true,
  });

  return material;
}
```

要求：

- 工厂验证必需资源。
- 材质必须有稳定且可读的 `name`。
- 不得在每帧创建材质。
- 不得在 Timeline 更新中创建 `Color`、`Vector` 等临时对象。

---

## 9. MaterialDefinition：不是语法糖，而是运行时契约

虽然 MVP 不做 Shader 语言语法糖，但编辑器、Timeline 和存档仍需要知道某个材质公开了哪些参数。

因此每个自定义材质必须提供一份**显式 TypeScript 定义**。它不是 GLSL 扩展，也不解析 Shader 源码；它只是项目运行时接口。

```ts
export type MaterialParameterType =
  | "number"
  | "boolean"
  | "color"
  | "vec2"
  | "vec3"
  | "texture";

export interface MaterialParameterDefinition {
  type: MaterialParameterType;
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  timeline: "continuous" | "discrete" | "disabled";
}

export interface MaterialDefinition {
  id: string;
  version: number;
  parameters: Readonly<Record<string, MaterialParameterDefinition>>;
}
```

示例：

```ts
export const dissolveDefinition: MaterialDefinition = {
  id: "dissolve",
  version: 1,
  parameters: {
    progress: {
      type: "number",
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
      timeline: "continuous",
    },
    edgeWidth: {
      type: "number",
      defaultValue: 0.08,
      min: 0.001,
      max: 0.5,
      step: 0.001,
      timeline: "continuous",
    },
    baseColor: {
      type: "color",
      defaultValue: "#cccccc",
      timeline: "continuous",
    },
    edgeColor: {
      type: "color",
      defaultValue: "#ffa040",
      timeline: "continuous",
    },
    noiseMap: {
      type: "texture",
      defaultValue: null,
      timeline: "discrete",
    },
  },
};
```

公开参数名称使用：

```text
progress
edgeWidth
baseColor
edgeColor
```

GLSL 内部名称使用：

```text
uProgress
uEdgeWidth
uBaseColor
uEdgeColor
```

映射只存在于 Three.js 材质实现层。Timeline 和关卡数据永远不引用 `uProgress`。

---

## 10. MaterialRuntime 接口

事件系统、Timeline、关卡系统和编辑器不得直接访问：

```ts
mesh.material.uniforms.uProgress.value
```

它们只通过 `MaterialRuntime`：

```ts
export type MaterialTarget = Readonly<{
  entityId: string;
  slot: string;
}>;

export type MaterialParameterValue =
  | number
  | boolean
  | string
  | readonly [number, number]
  | readonly [number, number, number]
  | readonly [number, number, number, number]
  | null;

export interface MaterialRuntime {
  applyMaterial(
    target: MaterialTarget,
    materialId: string,
    parameters?: Readonly<Record<string, MaterialParameterValue>>,
  ): void;

  setParameter(
    target: MaterialTarget,
    parameter: string,
    value: MaterialParameterValue,
  ): void;

  getParameter(
    target: MaterialTarget,
    parameter: string,
  ): MaterialParameterValue;

  resetParameter(target: MaterialTarget, parameter: string): void;

  disposeEntityMaterials(entityId: string): void;
}
```

Three.js 实现：

```text
src/runtime/three/materials/ThreeMaterialRuntime.ts
```

未来 Babylon.js 实现：

```text
src/runtime/babylon/materials/BabylonMaterialRuntime.ts
```

业务层不需要知道底层是 GLSL、TSL、WGSL、Three.js 还是 Babylon.js。

---

## 11. 关卡与 prefab 数据

关卡 JSON 只引用材质 ID 和公开参数：

```json
{
  "id": "gate_a",
  "components": {
    "Renderable": {
      "model": "gate_stone.glb",
      "materials": {
        "main": {
          "materialId": "dissolve",
          "parameters": {
            "progress": 0,
            "edgeWidth": 0.08,
            "baseColor": "#cccccc",
            "edgeColor": "#ffa040",
            "noiseMap": "texture:noise_01"
          }
        }
      }
    }
  }
}
```

禁止：

```json
{
  "fragmentShader": "void main() { ... }"
}
```

禁止：

```json
{
  "uniforms": {
    "uProgress": 0.5
  }
}
```

原因：关卡数据必须保持引擎中立和可迁移。

---

## 12. Timeline 与 Shader 集成

### 12.1 连续参数轨道

Timeline 通过材质公开参数进行采样：

```json
{
  "type": "material.parameter",
  "target": {
    "entityId": "gate_a",
    "slot": "main"
  },
  "parameter": "progress",
  "keys": [
    { "time": 0, "value": 0, "ease": "linear" },
    { "time": 2, "value": 1, "ease": "easeInOutCubic" }
  ]
}
```

运行时路径：

```text
TimelinePlayer
  → MaterialParameterTrack
  → MaterialRuntime.setParameter()
  → ThreeMaterialRuntime
  → ShaderMaterial.uniforms.uProgress.value
```

### 12.2 可连续插值类型

允许连续插值：

```text
number
vec2
vec3
color
```

离散切换：

```text
boolean
texture
enum/string
```

禁止对纹理 ID 做数值插值。

### 12.3 Timeline seek/scrub

材质参数轨道必须是确定性的：

```text
给定相同 timeline time
必须得到相同参数值
```

不得通过“累计每帧增量”实现剧情材质变化：

```ts
// 错误
progress += deltaTime * speed;
```

应基于绝对 Timeline 时间采样：

```ts
// 正确
progress = track.sample(timelineTime);
```

这样暂停、倒放、seek、scrub 和重新播放才可靠。

### 12.4 Event/Action 接入

离散事件统一使用 Action：

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

Action 仍然调用 `MaterialRuntime`，不得直接访问 Three.js。

---

## 13. 全局 Shader 参数

MVP 可实现少量固定全局参数，但不实现新的 Shader 语法。

推荐全局参数：

```text
uTime
uDeltaTime
uViewportSize
uCameraWorldPosition（通常 Three 已提供 cameraPosition）
uPlayerWorldPosition
uGlobalEffectStrength
```

统一由 `ThreeMaterialRuntime.updateGlobals()` 更新：

```ts
export interface ShaderGlobals {
  timeSeconds: number;
  deltaSeconds: number;
  viewportWidth: number;
  viewportHeight: number;
  playerWorldPosition: readonly [number, number, number];
}
```

规则：

- 不得由每个游戏组件重复更新 `uTime`。
- 全局值更新不得分配临时对象。
- Shader 没有声明某个 global uniform 时，运行时应跳过，而不是报错。
- 关键剧情变化仍由 Timeline 参数控制，不依赖全局时间隐式推导。

---

## 14. 材质实例与共享策略

### 14.1 默认共享

静态且参数相同的对象共享材质实例。

### 14.2 少量独立动画对象

剧情对象需要独立参数时，可以克隆材质，但必须：

- 在加载或绑定阶段克隆；
- 不得在每帧克隆；
- 在对象销毁时释放；
- 纹理仍尽量共享。

### 14.3 大量对象

大量相同对象具有不同参数时，不得为每个对象创建完整材质。应评估：

```text
InstancedMesh
InstancedBufferAttribute
vertex color
instance phase
共享纹理/查找表
```

例如大量草叶的风相位应使用实例 attribute，而不是一千份 `ShaderMaterial`。

### 14.4 禁止的行为

```ts
function update(): void {
  mesh.material = createDissolveMaterial(options); // 禁止
}
```

---

## 15. 纹理规范

### 15.1 颜色纹理

```ts
texture.colorSpace = THREE.SRGBColorSpace;
```

适用于：

```text
base color
emissive color
decal color
UI color texture
```

### 15.2 数据纹理

```ts
texture.colorSpace = THREE.NoColorSpace;
```

适用于：

```text
normal
roughness
metalness
AO
height
mask
noise
flow map
lookup data
```

### 15.3 纹理生命周期

- 纹理由 AssetManager 持有和引用计数。
- 材质销毁不应误销毁仍被其他材质使用的共享纹理。
- 动态生成的 render target 或 data texture 必须有明确 owner。

---

## 16. 后处理方案

MVP 后处理架构：

```text
WebGLRenderer
  → EffectComposer
  → RenderPass
  → 可选效果 Pass
  → OutputPass
```

规则：

1. 先使用 Three.js 已有 Pass。
2. 自定义后处理使用 `.vert.glsl` + `.frag.glsl` 和 `ShaderPass`。
3. Timeline 通过 `PostProcessRuntime` 控制公开参数。
4. 只允许最终输出环节做一次正确的 tone mapping/色彩空间转换。
5. 每个 Pass 必须支持 enable/disable，且禁用后不应继续分配或更新资源。

接口示例：

```ts
export interface PostProcessRuntime {
  setEnabled(effectId: string, enabled: boolean): void;
  setParameter(
    effectId: string,
    parameter: string,
    value: MaterialParameterValue,
  ): void;
}
```

Timeline 示例：

```json
{
  "type": "postprocess.parameter",
  "effectId": "vignette",
  "parameter": "intensity",
  "keys": [
    { "time": 0, "value": 0 },
    { "time": 1, "value": 0.8 },
    { "time": 3, "value": 0 }
  ]
}
```

---

## 17. 编辑器功能边界

MVP Shader/材质编辑器只做：

```text
显示当前材质 ID
显示 MaterialDefinition 中公开的参数
number slider/input
color picker
texture asset picker
boolean switch
重置默认值
实时预览
Timeline 参数选择
编译错误展示
```

不做：

```text
GLSL 在线代码编辑器
Shader Graph
节点编辑
语法自动生成
自动分析 GLSL uniform
自定义 Shader 语言
曲线编辑器之外的材质逻辑图
```

MaterialDefinition 是 Inspector 控件的来源；GLSL 文件由 AI/开发者在代码仓库中编辑。

---

## 18. 热更新策略

开发环境应支持 Vite HMR：

1. `.glsl` 文件改变；
2. 对应模块重新加载；
3. 创建新的 ShaderMaterial；
4. 复制旧材质的公开参数；
5. 替换场景材质；
6. dispose 旧材质；
7. 保持 Timeline 当前播放位置。

若新 Shader 编译失败：

- 编辑器显示错误；
- 保留旧的可用材质，或使用醒目的 fallback 材质；
- 不得让整个编辑器白屏；
- CI 中必须判定失败。

---

## 19. 错误处理与 fallback

### 19.1 Fallback 材质

提供统一错误材质：

```ts
export function createFallbackMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    name: "material:fallback-error",
    color: 0xff00ff,
    wireframe: false,
  });
}
```

### 19.2 错误信息必须包含

```text
materialId
material name
vertex/fragment stage
源文件路径
Three.js 版本
浏览器/GPU 基本信息
完整编译日志
触发场景或测试名称
```

### 19.3 不允许静默失败

以下行为禁止：

```ts
try {
  createMaterial();
} catch {
  return defaultMaterial;
}
```

必须记录结构化错误并暴露给编辑器和测试。

---

## 20. 测试方案

Shader 不是“肉眼看起来能跑就算完成”。每个生产 Shader 必须通过以下测试。

### 20.1 静态契约测试

检查：

- `materialId` 唯一；
- MaterialDefinition 版本存在；
- 默认参数类型正确；
- min/max/step 合法；
- Timeline 不暴露不可插值参数为 continuous；
- 关卡中的材质和参数引用存在；
- 参数值符合 schema。

### 20.2 浏览器编译测试

使用 Playwright/Chromium 或等效真实浏览器环境：

1. 创建最小 Three.js scene；
2. 为每个材质创建适合的 geometry；
3. 添加必需纹理；
4. 调用 `renderer.compileAsync(scene, camera)`；
5. 捕获 console error、Shader link error；
6. 任一材质失败则 CI 失败。

禁止仅用字符串正则作为 Shader 编译测试。

### 20.3 视觉回归测试

每个核心效果至少有一个固定 fixture：

```text
固定相机
固定几何体
固定纹理
固定时间
固定 viewport
固定参数
```

输出截图并进行带容差的像素比较。

需要视觉回归的优先级：

```text
P0：溶解、全息、关键剧情特效、输出 Pass
P1：后处理、描边、传送门
P2：辅助调试材质
```

### 20.4 Timeline 集成测试

至少验证：

```text
t = 0 参数值正确
t = 中间值插值正确
t = 结束值正确
seek 后值正确
倒放/重复播放不累计漂移
暂停后全局时间不会破坏剧情参数
```

### 20.5 资源释放测试

重复加载/卸载场景后监测：

```text
renderer.info.memory.textures
renderer.info.memory.geometries
renderer.info.programs
```

不要求瞬间归零，但不得持续线性增长。

---

## 21. 性能规范

### 21.1 CPU 侧

- 每帧更新 uniform 时不创建临时对象。
- 颜色、向量对象复用。
- 只更新发生变化的公开参数。
- 不在 render loop 中创建/销毁材质。
- 不在 Timeline 每帧查找字符串路径；轨道绑定阶段缓存目标。

### 21.2 GPU 侧

- 避免不必要的透明 overdraw。
- 避免高分辨率多层全屏 Pass。
- 避免无上限循环。
- 避免一个效果生成过多 Shader variants。
- 大量重复对象优先实例化。
- 移动端必须测真实设备，不根据桌面 GPU 推断。

### 21.3 Shader 预编译

关卡开始前对已知材质调用：

```ts
await renderer.compileAsync(scene, camera);
```

目标是减少首次出现特效时的卡顿。只有在目标设备不支持并行编译扩展时，才接受同步编译行为。

---

## 22. AI coding agent 实施规则

交给其他 AI 实现时，必须遵守以下规则。

### 22.1 修改 Shader 时的最小交付物

新增一个自定义材质必须同时提交：

```text
.vertex GLSL
.fragment GLSL
TypeScript 材质工厂
MaterialDefinition
MaterialRegistry 注册
编译测试
至少一个预览 fixture
必要的 Timeline 测试
```

不得只提交一段 fragment shader。

### 22.2 禁止事项

AI 不得：

- 发明新的 GLSL 语法；
- 为减少几行代码建立 Shader DSL；
- 在 level JSON 中写 GLSL；
- 在 React 组件中直接更新 uniform；
- 在 Event/Timeline 中直接引用 `uXxx`；
- 默认使用 `RawShaderMaterial`；
- 把 `onBeforeCompile` patch 写在业务组件中；
- 未经测试升级 Three.js 主版本；
- 捕获 Shader 错误后静默忽略；
- 根据截图猜测颜色空间问题而不检查纹理和输出转换。

### 22.3 处理编译错误的顺序

1. 读取完整 vertex/fragment 日志；
2. 确认错误属于哪个 stage；
3. 检查 varying 类型和名称是否一致；
4. 检查 uniform 类型是否一致；
5. 检查括号、分号、函数签名；
6. 检查纹理采样类型；
7. 检查 Three.js chunk 放置位置；
8. 检查颜色输出；
9. 在最小 fixture 中复现；
10. 修复后运行全部 compile test。

不得通过删除错误代码或关闭检查来“修复”。

### 22.4 处理视觉错误的顺序

1. 检查输入纹理 `colorSpace`；
2. 检查 Shader 内计算是否在线性空间；
3. 检查是否重复或遗漏输出转换；
4. 检查 tone mapping；
5. 检查透明、depthWrite、side；
6. 检查 UV 与模型 attribute；
7. 检查坐标空间；
8. 检查法线变换；
9. 最后再调颜色和系数。

---

## 23. 分阶段实施计划

### 阶段 S0：基础设施

实现：

```text
ThreeMaterialRuntime
MaterialDefinition
MaterialRegistry
MaterialRuntime 接口
GLSL ?raw 导入
fallback material
最小 Shader compile test
```

验收：

- 一个最小 ShaderMaterial 能被注册、应用和销毁；
- 编译错误在编辑器与 CI 中可见；
- game/director 层没有 `import "three"`。

### 阶段 S1：首个剧情材质

实现：

```text
dissolve shader
公开参数
材质 Inspector
Timeline material.parameter track
seek/scrub 测试
视觉回归 fixture
```

验收：

- 开关事件可播放 Timeline；
- Timeline 能把门从 0% 溶解到 100%；
- 拖动时间轴可确定性预览；
- 刷新页面后关卡数据一致。

### 阶段 S2：全局参数与第二个材质

实现：

```text
uTime/uDeltaTime 等全局参数
hologram 或 scanline shader
材质共享/克隆策略
资源释放测试
```

验收：

- 全局时间只有一个更新源；
- 关卡卸载后 GPU 资源不持续增长。

### 阶段 S3：后处理

实现：

```text
EffectComposer
RenderPass
OutputPass
至少一个可 Timeline 驱动的后处理效果
```

验收：

- 颜色空间只在最终输出处理一次；
- cutscene 可渐入/渐出 vignette 或全屏效果；
- 关闭 Pass 后无多余更新。

### 阶段 S4：生产质量

实现：

```text
关键 Shader 全量编译测试
核心效果视觉回归
移动设备性能基线
预编译策略
错误遥测
```

---

## 24. MVP 验收标准

Shader 子系统达到 MVP 完成，必须同时满足：

- [ ] 所有生产 Shader 使用独立 `.glsl` 文件。
- [ ] 所有 Shader 通过真实浏览器编译测试。
- [ ] 所有自定义材质存在 MaterialDefinition。
- [ ] Timeline 只引用公开参数，不引用 raw uniform。
- [ ] Event/Director/Game 层不 import Three.js 材质类型。
- [ ] 颜色纹理与数据纹理有正确 colorSpace。
- [ ] 直接输出 Shader 包含正确输出转换。
- [ ] 后处理链只有一个最终输出转换点。
- [ ] 编译失败有清晰 fallback 和错误日志。
- [ ] 关键效果有视觉回归测试。
- [ ] 场景卸载会 dispose 独占材质和资源。
- [ ] 没有自定义 Shader DSL、Shader Graph 或 WGSL 生产代码。

---

## 25. 未来语法糖的重新评估条件

不永久否定语法糖，但必须在真实证据出现后评估。

只有满足以下任意三项，才开启新的 ADR：

- 生产 Shader 数量达到约 10–15 个以上；
- 同类 uniform metadata 大量重复；
- Inspector 手写配置成为持续瓶颈；
- GLSL/TypeScript 参数不一致导致多次线上缺陷；
- 非程序人员需要频繁调整材质；
- Timeline 参数注册维护成本明显过高；
- 需要系统性共享 Shader 函数；
- 已决定迁移 WebGPU/TSL。

即使重新评估，首选也是“薄作者层”，不是新语言：

```text
参数类型与默认值
Inspector hints
参数分组
Timeline exposure
构建期一致性检查
```

仍不得轻易实现：

```text
控制流语法
自定义运算符
GLSL 编译器
GLSL → WGSL 转译器
完整 PBR 语言
```

---

## 26. 未来迁移策略

### 26.1 迁移 Three.js WebGPURenderer / TSL

当前 Three.js `WebGPURenderer` 不直接支持 `ShaderMaterial`、`RawShaderMaterial` 和传统 `onBeforeCompile()` 自定义方案；这些材质需要改写为 Node Material/TSL。

因此现在必须保持：

```text
游戏规则不依赖 ShaderMaterial
Timeline 不依赖 raw uniform
关卡不内联 GLSL
材质由 MaterialRuntime 隔离
```

未来迁移时：

保留：

```text
MaterialDefinition
公开参数名称
关卡材质引用
Timeline tracks
Event actions
编辑器 Inspector
游戏逻辑
```

重写：

```text
Three GLSL 材质工厂
ThreeMaterialRuntime 后端实现
自定义后处理 Pass
部分视觉回归基线
```

### 26.2 迁移 Babylon.js / WGSL

若未来切换 Babylon.js：

保留同样的公共契约，新增：

```text
BabylonMaterialRuntime
Babylon 材质工厂
WGSL Shader 或 Babylon 节点材质实现
```

不要尝试逐行机械翻译所有 GLSL；按视觉行为和公开参数重新实现，并用视觉回归验证。

---

## 27. 架构决策记录

### ADR-SHADER-001：MVP 使用 GLSL

**状态：Accepted**

决策：MVP 自定义 Shader 使用 GLSL 和 `THREE.ShaderMaterial`。

原因：标准化、AI 熟悉、工具成熟、实现直接、反馈快。

### ADR-SHADER-002：MVP 不做语法糖

**状态：Accepted**

决策：不实现自定义 Shader DSL、Godot-like 语法、Shader Graph 或自动 GLSL/WGSL 转换。

原因：避免削弱 AI 的标准 GLSL 能力，避免编译器与工具链工程。

### ADR-SHADER-003：材质参数通过 MaterialRuntime 暴露

**状态：Accepted**

决策：Timeline、Event、Editor 和关卡只使用公开参数，不访问 raw uniforms。

原因：可测试、可迁移、可校验、减少引擎耦合。

### ADR-SHADER-004：内置材质优先

**状态：Accepted**

决策：内置 PBR 能完成的效果不重写自定义 Shader。

原因：减少 Shader 数量、降低光照和颜色管理错误、提升迁移能力。

### ADR-SHADER-005：WebGPU 延后

**状态：Accepted**

决策：MVP 不以 WebGPU、WGSL 或 TSL 为生产基础。

原因：当前需求未证明其必要性；先完成 Sinan Engine 的 WebGL 渲染管线、材质系统和 Director System 联动闭环。

---

## 28. 给实现 AI 的启动提示词

以下内容可以直接提供给新的 coding agent：

```text
请按照《Sinan Engine：Shader 研发方案与架构指南》实现 Shader 子系统。

硬约束：
1. 使用 Three.js WebGLRenderer。
2. 自定义 Shader 使用独立 GLSL 文件和 THREE.ShaderMaterial。
3. 使用 Vite ?raw 导入 GLSL。
4. 不实现任何自定义 Shader DSL、语法糖、Shader Graph、WGSL 或 TSL。
5. 不在 JSON、React 组件、Event 或 Timeline 中直接操作 raw uniform。
6. 通过 MaterialRuntime 和 MaterialDefinition 暴露材质参数。
7. 第一个生产材质实现 dissolve，并支持 Timeline seek/scrub。
8. 添加真实 Chromium Shader 编译测试和最小视觉回归 fixture。
9. 保持 /game、/director、/events、/schemas 不 import three。
10. 每个阶段完成后运行 typecheck、unit test、browser shader compile test。

先实现阶段 S0，不要提前实现未来语法糖或 WebGPU。
```

---

## 29. 官方依据与参考资料

1. [Three.js ShaderMaterial 官方文档](https://threejs.org/docs/pages/ShaderMaterial.html)
   说明 `ShaderMaterial` 使用 GLSL、自带常用 attributes/uniforms，并仅用于 `WebGLRenderer`。

2. [Three.js WebGLRenderer 官方文档](https://threejs.org/docs/pages/WebGLRenderer.html)
   当前 `WebGLRenderer` 使用 WebGL 2；文档也提供 Shader 错误检查、`compileAsync()` 和资源统计接口。

3. [Three.js Color Management 官方指南](https://threejs.org/manual/en/color-management.html)
   说明 Linear-sRGB 工作流、纹理颜色空间设置，以及 `ShaderMaterial` 自行完成输出颜色空间转换的要求。

4. [Vite Static Asset Handling](https://vite.dev/guide/assets.html)
   说明通过 `?raw` 将 `.glsl` 等静态资源作为字符串导入。

5. [Three.js Post Processing 官方指南](https://threejs.org/manual/en/post-processing.html)
   说明 `EffectComposer`、Pass 链与自定义 GLSL 后处理流程。

6. [Three.js WebGPURenderer 迁移指南](https://threejs.org/manual/en/webgpurenderer)
   说明 `WebGPURenderer`、WebGL 2 fallback、TSL，以及传统 `ShaderMaterial`/`RawShaderMaterial`/`onBeforeCompile()` 需要迁移到 Node Material/TSL。

7. [Three.js TSL Specification](https://threejs.org/docs/TSL.html)
   作为未来 WebGPU/跨后端 Shader 路线的评估依据，不属于 MVP 实施范围。

---

## 30. 最终结论

本项目 Shader MVP 的正确策略不是追求最短语法，而是保持标准、透明、可测试：

```text
标准 GLSL
+ Three.js ShaderMaterial
+ 独立 .glsl 文件
+ 显式 TypeScript 材质工厂
+ MaterialRuntime 公共接口
+ Timeline 参数轨道
+ 浏览器编译测试
+ 视觉回归测试
```

语法糖、TSL、WGSL 和 Shader Graph 都属于后续可能的优化方向，而不是当前前置条件。

> **先让 AI 用它最熟悉的 GLSL 高速完成真实效果；只有真实维护成本出现后，才为已知问题增加薄工具层。**
