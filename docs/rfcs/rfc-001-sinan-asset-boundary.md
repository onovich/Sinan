# RFC-001：Sinan Asset Boundary

> 状态：Draft for alignment
> 日期：2026-06-20
> 关联战略：`docs/strategy/external-infrastructure-cooperation-strategic-decision.md`
> 适用合作方：Indirection / 资源寻址与加载系统

---

## 1. 摘要

Sinan Engine 将资源系统划分为两层：

```txt
Sinan Asset Contract
  source-of-truth, schema, validation, reference resolver, budget, fallback policy

Asset Backend / Partner Implementation
  compiled catalog, dependency graph, scope/handle lifecycle, loader backend, variants
```

Sinan 不完全自研长期资源基础设施，但必须保留 asset 语义主权。Indirection 或其他资源项目可以成为 Sinan 的 loader/catalog backend，但不能替代 Sinan 的 authoring manifest、schema、ReferenceResolver 和预算策略。

## 2. 背景

Sinan 当前已有：

- `data/assets.manifest.json`
- asset schema
- ReferenceResolver
- asset report / budget validation
- Three runtime GLB loading
- fallback model / diagnostics 路线

随着 Sinan Engine 继续推进，资源系统会自然扩展到 dependency、preload、scope、dispose、variant、compressed asset、CDN、low-end profile 和 report。完全自研会让引擎主线背上长期维护负担。

因此，Sinan 采用合作策略：自研 asset contract 和 fallback，合作方提供 specialized backend。

## 3. 目标

本 RFC 的目标是定义：

- Sinan 的 asset source-of-truth。
- 外部 resource backend 能接入的位置。
- Indirection POC 的阶段和验收标准。
- 哪些语义必须留在 Sinan，哪些可以交给合作方。

## 4. 非目标

本 RFC 不做：

- 不重命名现有 asset manifest。
- 不一次性替换 `ThreeAssetLoader`。
- 不强制引入 Indirection 作为 hard dependency。
- 不定义 CDN、patching、remote update 的完整商业管线。
- 不把 compressed assets 作为第一阶段测试硬依赖。

## 5. Source Of Truth

Sinan 的 authoring source-of-truth 是：

```txt
data/assets.manifest.json
data/prefabs/*.json
data/levels/*.json
data/timelines/*.json
data/cameraShots/*.json
```

外部 compiled catalog 可以作为构建产物存在，但不得取代 `data/assets.manifest.json`。

规则：

- 所有 public asset id 必须稳定。
- URL/物理位置可以变化，但 asset id 不能因为路径变化而变化。
- Prefab、level、timeline、cameraShot、material、UI 等数据引用 asset 时，只引用 public asset id。
- Runtime cache、loader handle、scope id 都不是 authoring source-of-truth。

## 6. Contract 概念

### 6.1 AssetId

稳定字符串 ID，用于所有 Sinan data references。

要求：

- 不含空格。
- 不包含本地绝对路径。
- 不直接暴露 CDN 或 dev server URL。
- 可被 ReferenceResolver 校验。

### 6.2 AssetManifest

Sinan authoring manifest。

职责：

- 描述 asset id、type、source URL、可选 metadata、budget hint、fallback hint。
- 提供给 editor、validator、report、runtime load plan。

### 6.3 CompiledAssetCatalog

外部 backend 可生成的 runtime/build 产物。

职责：

- 解析 dependency。
- 生成 variant。
- 提供 loader resolve。
- 输出 diagnostics/report。

限制：

- 不能成为手写 source-of-truth。
- 不能把 Sinan-specific policy 写死在外部 core。
- 不能绕过 Sinan asset validation。

### 6.4 AssetScope

运行时资源生命周期域。

示例：

```txt
scope: editor.gate-demo
scope: level.level_01
scope: showcase.delivery_city
```

职责：

- 显式 acquire/release。
- 支持 diagnostics。
- 支持 fallback。
- 不直接泄漏 Three object 到 Sinan semantic layer。

### 6.5 AssetHandle

外部 backend 可返回的 runtime handle。

限制：

- Handle 不进入 JSON。
- Handle 不进入 editor save state。
- Handle 不作为 stable id。

## 7. 接入边界

推荐数据流：

```txt
data/assets.manifest.json
  -> Sinan asset schema validation
  -> Sinan ReferenceResolver / budget policy
  -> optional Indirection compiler
  -> compiled catalog + report
  -> Sinan AssetSystem facade
  -> Indirection adapter/backend
  -> ThreeRuntime / audio / texture loader
```

Sinan 保留：

- `AssetSystem` facade。
- `AssetManifest` schema。
- ReferenceResolver。
- budget/report policy。
- editor display semantics。
- fallback policy。

合作方可提供：

- compiler。
- dependency graph。
- scope/handle lifecycle。
- loader adapters。
- cache policy。
- variant / compressed asset resolution。

## 8. Indirection POC Plan

### POC-1：Manifest Importer + Report

不改 runtime，只读取 Sinan manifest，输出：

- compiled catalog draft。
- missing reference report。
- budget report。
- fallback report。

验收：

- 不修改正式 data。
- 报告可 diff。
- Sinan 现有 validation 继续通过。

### POC-2：Fallback Loader Behind WebRuntime

保留 Sinan 外部契约：

```txt
WebRuntime.loadModel(assetId, url)
```

内部可通过 Indirection adapter 解析 scope/handle。

验收：

- Gate Demo 模型加载正常。
- 缺失资源触发 deterministic fallback。
- Browser smoke 通过。
- Three-specific decoder 仍只在 Three adapter 内。

### POC-3：Scene Scope / Group Preload

Gate Demo 加载时 acquire scene scope，离开时 release。

验收：

- 有 scope diagnostics。
- 重复加载不重复泄漏。
- dispose 行为可测。

### POC-4：Variant / Compression

仅在前置 POC 稳定后推进。

验收：

- low-end profile 可以选择轻量 variant。
- 压缩 decoder 不成为普通测试硬依赖。
- fallback path 始终存在。

## 9. 验收标准

任何 asset backend 进入 Sinan 主线前必须满足：

- 不替代 `data/assets.manifest.json`。
- 不绕过 Sinan schema validation。
- 不让 Three object 泄漏进 `src/data/**`、`src/schemas/**`、`src/events/**`、`src/director/**`。
- 有 deterministic fallback。
- 有 diagnostics。
- 有 contract tests。
- 有 Gate Demo smoke。
- 可通过 feature flag 或 adapter 回退到 Sinan 内置 loader。

## 10. 拒绝方案

拒绝：

- 直接把外部 compiled catalog 当作唯一 asset source。
- 让外部 loader 直接修改 prefab/level/timeline JSON。
- 在 Sinan JSON 中保存 loader handle 或 runtime URL。
- 在外部 core 中写死 Sinan Gate Demo 特例。
- POC 未完成就删除 Sinan 内置 loader。

## 11. Open Questions

- Compiled catalog 存放在 `data/.compiled`、`public` 还是 build cache？
- Asset budget policy 是否应独立为 `data/assetBudgets/*.json`？
- 是否需要为 Inscape 暴露一份 resource catalog export？
- Adapter 是放在 Sinan repo 内，还是外部 `@indirection/sinan` package？
