# Sinan Engine 外部基础设施合作战略决定

> 日期：2026-06-20
> 状态：Approved / 战略决策已采纳
> 决策对象：资源加载、输入模块、相机控制、Runtime UI 框架，以及后续叙事 authoring 合作
> 决策角色：Sinan Engine 项目负责人 / CEO 视角
> 通知对象：商务部门、技术架构部门、后续合作方负责人

---

## 1. 决策结论

Sinan Engine 不选择完全封闭自研，也不在当前阶段要求外部项目直接并入 Sinan。

正式采用以下合作策略：

```txt
Sinan owns contracts.
Partners own specialized implementations.
POCs prove value.
Validation protects boundaries.
Successful adapters become optional first-party integrations.
```

也就是说：

- Sinan 自研并掌握 engine semantic contracts、schema、registry、source-of-truth、validation、adapter boundary、fallback、POC 验收和官方集成入口。
- 合作方保留独立 core、独立包治理和跨项目价值。
- 双方先通过小型 POC、contract tests、Gate Demo / Showcase Mode、compatibility matrix 证明价值。
- 只有在 POC 稳定、接口连续兼容、维护责任清晰后，才讨论 Sinan Engine Infrastructure Kit、联合品牌、npm scope 统一或更深层组织合并。

## 2. 为什么这是最符合项目利益的选择

Sinan 已经升级为 AI-native、data-first、Web 原生 3D 游戏引擎。如果输入、资源、相机、Runtime UI 全部封闭自研，短期看似可控，长期会让引擎主线被横向基础设施吞没。

但如果现在直接收编外部项目，Sinan 会过早承担未成熟项目的治理、品牌、API 稳定、版本兼容和维护责任。这会把我们从“定义 AI 原生 Web 游戏引擎标准”的位置，拖成“同时管理多个早期基础设施项目”的位置。

最优解是成为第一方设计伙伴：

- Sinan 提供真实宿主、真实 demo、真实验收标准。
- 合作方提供专业实现、算法、设备适配、UI runtime 或加载基础设施。
- Sinan 用 contract 和 adapter 影响标准，而不是用组织收编制造负担。

## 3. 单项决策

| 方向           | 决策                                          | 合作对象    | 优先级 | Sinan 必须掌握                                                                                          |
| -------------- | --------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------------------------------------- |
| 资源加载       | 强合作，不完全自研                            | Indirection | P0     | `assets.manifest.json`、asset schema、ReferenceResolver、budget policy、fallback、report、Sinan adapter |
| 输入模块       | Sinan 先做最小 contract，再接外部 backend     | InputFlow   | P1     | Input action 命名、InputMap schema、context priority、EngineLoop 集成、Event/World 映射                 |
| 相机控制       | 核心自研，高级 rig 合作                       | ViewRig     | P1/P2  | CameraShot schema、DirectorCameraSystem、Timeline camera track、scrub/preview/restore、editor command   |
| Runtime UI     | Editor React 保持自研；Runtime UI 窄 POC 合作 | LudoWeave   | P2     | RuntimeUIViewModel、UIActionRef、Director/Timeline 到 UI 的事实源、Editor command/save/undo             |
| 叙事 authoring | 不进 engine core，作为外部 pipeline 合作      | Inscape     | P1/P2  | Host Schema、Action/Condition/Event catalog、importer report、Sinan runtime ownership                   |

## 4. 不可谈判红线

以下红线同时适用于商务谈判、技术评审和 POC 验收：

- 外部 core 不得 import Sinan 内部 editor store、Three runtime、React editor state 或项目私有目录。
- Sinan 的 JSON/source-of-truth 不能被外部 GUI hidden state、runtime cache 或私有序列化格式替代。
- 外部项目不得定义 Sinan 主循环、World ownership、Event/Action 语义或 editor save/undo 机制。
- POC 未通过前，不进入 Sinan roadmap hard dependency。
- 所有合作必须有 deterministic fallback、dry-run/report 或可回退路径。
- 所有 public ID、错误码和 diagnostics 必须结构化、可测试、可 diff。
- Adapter 可以第一方维护，core 不应被 Sinan 特例污染。

## 5. 合作推进阶段

### 阶段 A：非排他第一方设计伙伴

目标：低承诺启动合作。

产物：

- 一页合作 RFC 或 POC brief。
- 双方确认领域边界、非目标、验收标准。
- Sinan 给出最小宿主契约。
- 合作方给出最小 core API / schema draft。

### 阶段 B：Gate Demo / Showcase POC

目标：用真实项目证明能跑。

建议切片：

- Indirection：manifest importer + asset report + fallback loader。
- InputFlow：`interact` / `select` / modal isolation / virtual replay。
- ViewRig：follow/orbit/rail pose spike，不重写 CameraShotPlayer。
- LudoWeave：Prompt / Subtitle / Objective / Pause runtime UI。
- Inscape：sample narrative graph/localization -> Sinan importer dry-run report。

### 阶段 C：官方 adapter 与兼容矩阵

目标：从 demo 变成可持续集成。

产物：

- Sinan 内部 adapter module 或独立 adapter package。
- Contract tests。
- Compatibility matrix。
- Release notes。
- Partner integration documentation。

### 阶段 D：Sinan Engine Infrastructure Kit

触发条件：

- 至少两个连续版本兼容。
- POC 已进入 Sinan 主线或 Showcase Mode。
- 合作方 core 在非 Sinan 示例中也能工作。
- License、versioning、scope、brand、维护责任都已谈清楚。

## 6. 立即执行事项

本决策批准后，立即推进：

1. 发布商务部门通知，统一对外合作话术和谈判边界。
2. 发布技术架构部门通知，统一 architecture ownership 和 POC 验收口径。
3. 建立四份第一批 RFC：
   - `RFC-001 Sinan Asset Boundary`
   - `RFC-002 Sinan Input Context`
   - `RFC-003 Sinan Runtime UI ViewModel`
   - `RFC-004 Sinan Camera Pose / Shot / Rig Boundary`
4. 相机控制进入第一批 RFC，但实现仍排在资源和输入之后。第一阶段只允许 ViewRig 技术 spike，不允许替换 CameraShotPlayer 或 DirectorCameraSystem。
5. 任何合作讨论都必须引用本战略决定，不得以外部项目文档直接替代 Sinan source-of-truth。

## 7. 决策引用

本战略决定吸收并固化以下两份内部评估的共同结论：

- `docs/external-project-cooperation-evaluation.md`
- `docs/external-infrastructure-partnership-assessment.md`

二者仍作为评估材料保留，但后续执行以本文和 RFC 为准。
