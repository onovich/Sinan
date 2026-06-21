# Sinan Engine 外部项目合作评估

> 日期：2026-06-20
> 状态：架构评估 / 决策建议
> 背景：Sinan 已从 Scene Director 定位升级为 Sinan Engine。本文站在 Sinan 当前技术负责人和架构师视角，评估资源加载、UI 框架、输入系统、相机控制方案，以及上层目录 Inscape 项目，与 Sinan 自研/合作的取舍。

---

## 1. 文档隔离状态

外来项目文档已从 `docs/` 根目录移动到：

```txt
docs/external-projects/
  README.md
  indirection/
    Indirection_寻址_架构与技术选型设计_v0.1.md
  inputflow/
    InputFlow-Design-Document-v0.1.md
  ludoweave/
    LudoWeave_游织_完整架构与技术设计说明书_v2.0.docx
  viewrig/
    ViewRig_视角_设计文档 (1).md
```

隔离原则：

- 这些文档是第三方/潜在合作方参考材料。
- 它们不是 Sinan source-of-truth 架构文档。
- 后续 AI executor 不应把它们当作 Sinan phase plan、implementation guide、schema contract 或 acceptance gate。
- Sinan 接受的结论必须写在 Sinan 自有文档中，例如本文。

---

## 2. 总体判断

Sinan 现在已经是游戏引擎项目，而不是独立导演系统。升级后，输入、相机、资源加载、Runtime UI、叙事工具都应被放进 first-party engine systems 或 adapter ecosystem 中评估。

我的核心建议是：

```txt
Sinan 自研并掌握核心语义、数据协议、schema、registry、runtime bridge、validation 和 editor command。
外部项目适合作为算法库、adapter backend、工具前端、widget、authoring 辅助或独立 pipeline。
```

也就是说，我们不是简单问“用不用外部库”，而是要问：

1. 它是否能接受 Sinan 的 data-first 和 adapter boundary？
2. 它是否能把关键状态导出为可校验、可迁移、可 diff 的数据？
3. 它是否愿意从小型 Gate Demo / Showcase POC 开始？
4. 它是否愿意让 Sinan 作为第一方设计伙伴参与标准制定？
5. 它是否会反过来绑架 Sinan 的核心语义、主循环、编辑器状态或保存格式？

外部项目普遍处于超早期，这有利也有弊：

- 好处：API 尚未冻结，Sinan 可以影响其 contract、测试、adapter 和真实用例。
- 代价：我们需要承担较高的架构指导、验收标准、POC 设计和工程反馈成本。
- 风险：如果外部项目失速或抽象不稳，Sinan 不能让主线研发被卡住。

因此，合作应采用“窄 POC + 明确边界 + 可回退”的方式，而不是战略深绑。

---

## 3. 快速决策表

| 项目 | 方向 | 推荐策略 | 合作优先级 | 性价比判断 |
| --- | --- | --- | --- | --- |
| Indirection | 资源寻址与加载 | **强烈建议合作，但 Sinan 保留 asset manifest/schema/budget/ReferenceResolver 主权** | P0 | 高。资源系统复杂且通用，外部独立项目能分摊长期成本。 |
| InputFlow | 输入系统 | **Sinan 先自研最小 InputSystem contract，再与 InputFlow 合作设备适配/重绑定/replay** | P1 | 中高。方向契合，但 Sinan 当前可先做轻量版本，避免等待外部库成熟。 |
| ViewRig | 相机控制 | **核心 CameraShot/DirectorCameraSystem 自研，ViewRig 合作高级 rig/constraint/blending** | P1 | 中高。相机是 Sinan 差异点，不能外包语义，但高级相机算法值得合作。 |
| LudoWeave | UI runtime/framework | **不作为 Sinan Editor 根框架；可在 Runtime UI/HUD 做低风险 POC** | P2 | 中低到中。愿景大，指导成本高；适合局部验证，不适合近期深绑。 |
| Inscape | 叙事 DSL/作者工具 | **不进 Sinan core；可作为外部 narrative authoring pipeline / Host Bridge 合作对象** | P2/P3 | 中。对剧情、本地化和作者工具有价值，但不应影响当前引擎主线。 |

推荐合作顺序：

```txt
1. Indirection：资源 catalog / loader / scope POC
2. InputFlow：Showcase interact + editor/gameplay 输入隔离 POC
3. ViewRig：CameraShot 或第三人称/轨道相机增强 POC
4. LudoWeave：Gate Demo Runtime HUD / Prompt / Subtitle POC
5. Inscape：Narrative Graph / localization / Host Bridge dry-run
```

---

## 4. Indirection 评估

### 4.1 项目理解

Indirection 是一个独立、引擎中立、manifest-first 的 Web 游戏资源寻址、构建工具和运行时项目。它强调：

- `AssetId` 与 URL/物理位置分离。
- authoring manifest 与 compiled catalog 分离。
- runtime core 零外部依赖。
- `AssetHandle` / `AssetScope` 显式生命周期。
- 资源依赖、group、variant、fallback、cache、loader adapter。
- Three adapter、Vite plugin、CLI/report、Sinan bridge 作为外围包。

它与 Sinan 已有 Phase 17 asset metadata、budget、report-assets、fallback、Three runtime boundary 高度契合。

### 4.2 自研 vs 合作

完全自研的优点：

- 可以非常快地贴合 Sinan 当前 `assets.manifest.json`。
- 不需要等待一个外部 monorepo、compiler、runtime、adapter 体系成熟。
- 近期风险低，改动面可控。

完全自研的问题：

- 资源系统长期会自然膨胀：variant、preload、cache、decoder、scope、progress、report、budget、compression、CDN、low-end profile 都会进入 Sinan。
- 这些能力具有通用基础设施价值，全部压在 Sinan 内部会让引擎主线负担过重。
- 资源生命周期和缓存策略很容易越写越深，最后变成隐藏的大系统。

合作的优点：

- Indirection 的抽象方向很接近 Sinan 的真实需求。
- 它的独立定位可以避免资源系统被 Sinan 特例绑死。
- Sinan 可以作为第一个真实宿主，反过来逼它做 contract tests、fallback、diagnostics 和 bundle discipline。

合作的代价：

- Indirection 还处于 v0.1 设计期，我们需要参与 protocol、manifest importer、lifecycle、Three adapter 的早期设计。
- 如果它一开始做得过大，Sinan 会承担外部项目架构试错成本。

### 4.3 建议

建议与 Indirection 合作，优先级最高，但采用分阶段接入：

1. **POC-1：构建/报告层，不改 runtime。**
   读取 Sinan 现有 `data/assets.manifest.json`，输出 compiled catalog 和 asset report，验证 metadata/budget/fallback。

2. **POC-2：接管一个模型加载路径。**
   保留 `WebRuntime.loadModel(assetId, url)` 外部契约，内部通过 Sinan bridge 调用 Indirection scope/handle。

3. **POC-3：scene scope 和 group preload。**
   Gate Demo 加载时 acquire `scene.gate`，退出时 dispose scope，验证 refCount、fallback、diagnostics。

4. **POC-4：压缩/variant。**
   仅在 decoder 和资产准备好后启用 Draco/meshopt/KTX2，不把压缩资产变成测试硬依赖。

Sinan 必须保留：

- `data/assets.manifest.json` 作为 authoring source of truth。
- asset schema 和 ReferenceResolver 主权。
- report-assets 的 Sinan-specific budget policy。
- Three.js decoder/transcoder 只能在 `src/runtime/three/**` 或 Indirection Three adapter 内。

合作性价比：**高**。这是最值得投入第一方指导的项目。

---

## 5. InputFlow 评估

### 5.1 项目理解

InputFlow 是一个 framework-neutral、renderer-neutral 的输入动作路由系统。它强调：

- browser raw input -> control path -> binding -> processor -> interaction -> action snapshot。
- `InputMap` 和 override 可序列化。
- editor/gameplay/modal/text editing context routing。
- virtual input、replay、deterministic tests。
- core 无 DOM/React/Three 依赖。
- React 只做 diagnostics/settings，不承载热路径。

这和 Sinan 计划中的 `InputSystem`、Showcase Mode、editor/gameplay 输入隔离非常契合。

### 5.2 自研 vs 合作

完全自研的优点：

- Sinan 当前短期只需要少量动作：interact、move、camera/editor navigation、modal command。
- 自研最小版本可以快速服务 Phase 23/24 Showcase gameplay。
- 我们可以直接按 EngineSession/World/Event 的语义设计，不受外部 API 波动影响。

完全自研的问题：

- 输入系统后期细节很多：gamepad、touch、focus、modal、rebind、record/replay、blur reset、text editing、虚拟摇杆、mobile。
- 如果只为 Gate Demo 写硬编码输入，后面会形成技术债。

合作的优点：

- InputFlow 的 action/context/replay 模型正好能补 Sinan 的长期输入能力。
- Virtual Source 和 Replay 对 AI 自动化、Playwright smoke、Showcase demo 很有价值。
- 它可以服务其他 Web 游戏项目，值得作为独立基础设施打磨。

合作的代价：

- 对 Sinan 当前需求而言，InputFlow 完整设计偏大。
- 若等待 InputFlow 完整 v0.1，可能拖慢 Sinan gameplay/input 的落地。
- 输入路由必须深度理解 Sinan EditorSessionBridge、EngineMode、World query、Event trigger，指导成本不低。

### 5.3 建议

建议采用混合策略：

1. Sinan 自研一个最小 `src/input/**` contract：
   - `InputAction`
   - `InputSnapshot`
   - `InputContext`
   - `InputMap` schema
   - `BrowserInputAdapter`
   - `VirtualInputSource` test fixture

2. 这个 contract 设计时参考 InputFlow，但不立即把 Sinan 主线绑定到外部包。

3. 与 InputFlow 合作的首个 POC 应是：
   - `runtime.gameplay.interact`
   - editor/gameplay/modal context 隔离
   - `E`、Pointer Primary、Gamepad South/A
   - Virtual Replay 完成一次 Gate interaction smoke

4. 如果 POC 稳定，再考虑由 InputFlow 提供 browser/gamepad/rebind/replay backend，Sinan 保留 EngineMode/Event/World 映射。

Sinan 必须保留：

- input action 命名和 gameplay 语义。
- editor/global/modal/gameplay context 的优先级策略。
- 与 EventSystem/WorldQuery 的交互边界。
- inputMap 是否写入 `data/inputMaps/*.json` 的 schema 主权。

合作性价比：**中高**。适合合作，但 Sinan 不应等待它成熟后才推进自己的 InputSystem。

---

## 6. ViewRig 评估

### 6.1 项目理解

ViewRig 是一个 engine-agnostic camera rig library。它采用类似 Cinemachine 的思路：

- VirtualCamera 不是真实相机。
- CameraBrain 选择、切换、blend 多个 VirtualCamera。
- Rig/Aim/Composer/Constraint 分层。
- ControlChannel 保存 yaw/pitch/zoom/shoulder/rail 等状态。
- WorldProbe 接入 raycast/spherecast/closestPoint。
- Adapter 只把 `CameraState` 写进 Three/Babylon/PlayCanvas。

它覆盖第一人称、第三人称、orbit、rail、fixed、dead/soft/hard zone、confiner、collision、occlusion 等能力。

### 6.2 自研 vs 合作

完全自研的优点：

- Sinan 的 camera shot、timeline、DirectorCameraSystem 已经存在，并且是核心差异化能力。
- CameraShot JSON、preview-safe scrub、restore camera、timeline blending 必须由 Sinan 自己定义。
- 自研更容易保持和 Director/Event/Material/Animation 一致的调度模型。

完全自研的问题：

- 高级相机是复杂专门领域：third-person rig、collision avoidance、rail、screen composer、camera shake、state inheritance 都有大量手感细节。
- 如果全部放入 Sinan，会让 CameraSystem 成为大模块，拖慢其他引擎系统建设。

合作的优点：

- ViewRig 的 ports/adapters 模型与 Sinan 边界匹配。
- 它能提供 Sinan 不宜在早期独自深挖的高级 camera rig 算法。
- 相机 POC 很容易形成高展示价值 demo。

合作的代价：

- 如果 ViewRig 试图替代 Sinan CameraShot 数据模型，会直接冲突。
- Sinan 的 Director camera 不只是 gameplay camera，还要支持 timeline scrub、camera shot authoring、editor view through camera。
- 需要把 ViewRig 的 CameraBrain/Rig 概念映射到 Sinan public data contract，而不是把 ViewRig runtime state 直接变成事实源。

### 6.3 建议

建议合作，但边界必须很硬：

Sinan 自研掌握：

- `data/cameraShots/*.json`
- CameraShot schema
- Timeline `camera.shot` track
- DirectorCameraSystem
- preview/scrub/restore camera 规则
- editor CameraShotPanel 和 command-backed edits

ViewRig 适合提供：

- gameplay third-person/orbit/follow rig
- rail/path camera sampling
- collision/occlusion/confiner algorithms
- camera blending utility
- debug overlay / path visualization
- editor viewport navigation feel

首个 POC 建议二选一：

1. **CameraShot POC**：用 ViewRig 的 blend/composer/rail 算法增强 `cam_gate_reveal`，但数据仍落在 Sinan cameraShot JSON。
2. **Showcase Camera POC**：为 Phase 24 player movement 做 third-person/follow camera，输出 `RuntimeCameraPose` 给 `WebRuntime.setCameraPose`。

不建议第一步：

- 不要把 CameraShot JSON 替换成 ViewRig 私有配置。
- 不要让 ViewRig 直接读 Three.Camera。
- 不要让 ViewRig 接管 DirectorSystem。

合作性价比：**中高**。相机是 Sinan 差异点，因此适合“核心自研 + 高级 rig 合作”。

---

## 7. LudoWeave 评估

### 7.1 项目理解

LudoWeave 是一个 TypeScript-first、code-first、engine-agnostic game UI runtime。它不是普通 React 组件库，而是想建立：

- ViewModel -> pure view function -> UiNode IR -> Resolve/Layout -> ResolvedUiFrame -> Renderer。
- DOM、Canvas2D、Pixi/WebGL、未来 WebGPU 等多后端。
- runtime 管理 hover、pressed、focus、pointer capture、scroll、animation progress 等瞬态状态。
- ActionRef 而不是任意闭包。
- 与 Sinan 的建议集成是 Gate Demo Runtime UI：Prompt、Subtitle、Objective、Pause Menu。
- 明确不建议首批重写 Sinan React 编辑器。

### 7.2 自研 vs 合作

完全自研的优点：

- Sinan 当前 Editor 已经是 React，且 editor command/dirty/save/undo 与现有 store 深度绑定。
- Runtime UI 初期可用 React overlay 或轻量 DOM 实现，足以服务字幕、HUD、delivery job prompt。
- 自研可以避免引入一个尚未稳定的大型 UI runtime。

完全自研的问题：

- 后续 Runtime UI 会涉及 gamepad focus、HUD、dialogue、pause menu、mobile layout、accessibility、多 surface。
- 如果用 ad hoc React overlay 写，会在 editor UI 和 runtime UI 之间继续混杂。

合作的优点：

- LudoWeave 的 Runtime UI 边界意识很好：业务状态宿主持有，UI runtime 消费 ViewModel 并发 Action。
- 它非常重视 AI-friendly、测试、renderer conformance 和多后端，这和 Sinan 长期方向一致。
- 它能帮助 Sinan 从“编辑器 UI”中分离出真正的 Runtime UI System。

合作的代价：

- LudoWeave 目标很大，早期 guidance 成本最高。
- 它如果做成完整 UI runtime，复杂度不低于一个小型框架。
- Sinan 当前更缺 Input/Physics/Showcase gameplay，Runtime UI 不是最紧迫瓶颈。
- 若过早引入，会带来 UI IR、layout、focus、renderer conformance 等一整套新负担。

### 7.3 建议

不建议让 LudoWeave 成为 Sinan Editor 的根框架。Sinan Editor 继续保留 React。

可以合作，但只限 Runtime UI/HUD 小切片：

1. Gate Demo Prompt。
2. Subtitle。
3. Objective / delivery job hint。
4. Pause Menu。

首个 POC 约束：

- 不改 Sinan editor panels。
- 不改 `data/timelines/*.json`。
- Subtitle 仍由 Director/Timeline 产生命令或 ViewModel。
- LudoWeave 只消费 runtime UI ViewModel，发出 ActionRef。
- 同一组件必须能在 standalone playground 和 Sinan Gate Demo 中运行。

Sinan 必须保留：

- editor command/undo/dirty/save。
- RuntimeUISystem 的系统边界。
- Timeline/Director 对 subtitle/dialogue 的事实源。
- React editor shell。

合作性价比：**中低到中**。它可能很有未来价值，但短期不应排在资源、输入、相机之前。

---

## 8. Inscape 评估

### 8.1 项目理解

Inscape 位于 `D:\LabProjects\Inscape`，不是这四份外来方案之一，但与 Sinan 也存在合作考察空间。

它的定位是：

```txt
.inscape 叙事源文本
  -> Compiler Core
  -> Narrative Graph IR / diagnostics / source map / localization anchors
  -> VSCode / SelfHostedEditor / CLI / Runtime / Engine Adapter
```

Inscape 不是完整游戏引擎。它主要解决：

- 剧情 DSL。
- 叙事图 IR。
- 本地化 anchor / CSV 更新。
- Host Schema / Host Bridge。
- VSCode 和 SelfHostedEditor 作者工具。
- Unity 或未来引擎 adapter。

它和 Sinan 的潜在交集在：

- narrative authoring。
- dialogue/subtitle。
- quest/branching story。
- localization。
- Host Schema/Bridge。
- Director Timeline hook。

### 8.2 自研 vs 合作

Sinan 完全自研剧情/对白工具的优点：

- Sinan 当前有 Event/Condition/Action/Timeline/Subtitle/Director，能直接构建项目内叙事数据。
- 不需要引入另一个 DSL/编译器/编辑器生态。
- 对 Abeto-like vertical slice 来说，短期可能只需要少量交互文本和任务提示。

完全自研的问题：

- 一旦进入较多剧情文本、本地化、分支、作者工作流，Sinan 会重复造叙事 DSL、文本锚点、翻译继承、节点图、作者编辑器。
- Inscape 在这方面已经有较完整的理念和工具链。

合作的优点：

- Inscape 的 text-first narrative authoring 与 Sinan 的 data-first engine 可以互补。
- Host Schema / Host Bridge 模式和 Sinan 的 registry/reference resolver 思维兼容。
- 它可以成为 Sinan 的外部作者工具，而不是引擎 core。

合作的代价：

- Inscape 是 C#/.NET + VSCode/SelfHostedEditor 体系，技术栈与 Sinan TypeScript/Vite/Three 不同。
- 它的 Runtime/Editor 尚在演进，不适合让 Sinan 主线依赖。
- 如果深度接入，会引入 narrative IR、Host Bridge、本地化 CSV、import/export、live preview 等大范围协议。

### 8.3 建议

不建议把 Inscape 纳入 Sinan core，也不建议近期替换 Sinan 的 Event/Director 数据模型。

建议把 Inscape 作为外部 narrative authoring pipeline 评估：

1. **静态 dry-run**：
   - Inscape 提供一个小型 `.inscape` sample。
   - 导出 Narrative Graph IR / manifest / localization CSV。
   - Sinan 提供 resource/event/timeline catalog 样例。
   - 双方定义最小 Host Bridge。
   - Sinan importer dry-run 只输出报告，不改正式数据。

2. **Host Schema / Host Bridge POC**：
   - Sinan 导出可用 action、condition、event、timeline、cameraShot、speaker、asset 的 capability catalog。
   - Inscape 编辑器用这些信息做补全、Hover、missing binding diagnostics。

3. **Importer POC**：
   - 将 Inscape 某个 narrative node 映射到 Sinan event/timeline/subtitle/dialogue data。
   - 生成物必须可 review、可 diff、可回滚。

4. **Runtime/live preview 延后**：
   - 只有静态导入和 Host Bridge 稳定后，才讨论 Inscape Runtime 与 Sinan EngineSession 的 live preview。

Sinan 必须保留：

- Event/Condition/Action/Timeline/CameraShot/Material/Runtime UI 数据协议。
- DirectorSystem 运行时编排。
- Runtime save/state/action ownership。
- 引擎资源、渲染、输入、UI、物理、构建发布主权。

合作性价比：**中**。对叙事密集路线很有价值，但不是当前引擎底座最紧急事项。

---

## 9. 对合作方的第一方指导清单

由于这些项目都在超早期，如果合作，Sinan 不只是“使用者”，而会是第一方设计伙伴。我们需要提供以下东西：

### 9.1 通用规范

- 数据必须可序列化、可 diff、可 migration。
- runtime cache 不是事实源。
- 不允许 `eval`、脚本字符串、未注册函数或 raw engine object 进入 JSON。
- 所有 public ID 都要稳定。
- 所有错误要结构化并可测试。
- 必须有 deterministic fallback 或 failure mode。
- 必须有 browser smoke 或 contract tests。

### 9.2 Sinan Integration Kit

建议准备：

```txt
docs/partner-integration-kit/
  sinan-engine-overview.md
  data-contract-rules.md
  adapter-boundary-rules.md
  validation-and-smoke-requirements.md
  performance-budget.md
  gate-demo-fixture.md
  error-diagnostics-contract.md
```

以及代码侧 fixture：

```txt
tests/partner-fixtures/
  gate-demo-project.json
  asset-catalog.fixture.ts
  input-replay.fixture.ts
  camera-shot.fixture.ts
  runtime-ui.fixture.ts
```

### 9.3 POC 验收口径

任何合作 POC 至少要回答：

1. 是否保留 Sinan 数据事实源？
2. 是否能通过 adapter 接入，不侵入 core？
3. 是否有可跑测试？
4. 是否有 fallback？
5. 是否能在 Gate Demo 或 Showcase slice 中证明真实价值？
6. 是否能清楚回退，不阻塞 Sinan 主线？

---

## 10. 推荐推进路线

### 10.1 近期：Phase 20 期间

Phase 20 是 Shader Globals And Postprocessing Ramp，不建议同时引入大型外部依赖。

建议只做文档和接口准备：

- 保持 `docs/external-projects/**` 隔离。
- 写 partner integration kit 初版。
- 为 Indirection/InputFlow/ViewRig/LudoWeave/Inscape 各列一个最小 POC brief。
- 不改 runtime 主线。

### 10.2 中短期：Phase 21-22

优先推进 Indirection：

- 资源 catalog/report POC。
- loader replacement POC。
- scene scope POC。

原因：Phase 22 LOD/Instancing/Vegetation 会把 asset loading、budget、group、variant、instancing hint 的价值推高。

### 10.3 中期：Phase 23-24

推进 InputFlow 和 ViewRig：

- Phase 23 spherical world 需要 input、camera、surface movement。
- Phase 24 delivery gameplay 需要 Showcase Mode、player control、interact、camera follow。
- InputFlow 和 ViewRig 的价值会在这两个阶段变得更真实。

### 10.4 后续：Runtime UI 与叙事 authoring

推进 LudoWeave 和 Inscape：

- LudoWeave 用于 runtime HUD/prompt/subtitle/pause menu，不改 editor 根框架。
- Inscape 用于 narrative authoring / localization / Host Bridge，不进入 engine core。

这两者应在 Sinan 的 RuntimeUISystem、DialogueSystem、Showcase gameplay 初步成形后再更深入。

---

## 11. 最终建议

### 11.1 不建议完全自研一切

如果 Sinan 完全自研资源加载、输入、相机、UI、叙事工具，短期可能更快，但长期会让引擎主线被基础设施淹没。

特别是资源加载和高级相机，这两个方向独立合作价值很高。

### 11.2 也不建议深度绑定外部项目

这些项目都还在早期，不能成为 Sinan 的主线阻塞项。

不能接受：

- 外部项目接管 Sinan source-of-truth。
- 外部项目定义 Sinan 主循环。
- 外部项目要求绕开 schema/registry/ReferenceResolver。
- 外部项目把 GUI 内部状态当成唯一事实源。

### 11.3 最佳路径

最佳路径是：

```txt
Sinan owns contracts.
Partners own specialized implementations.
POCs prove value.
Validation protects boundaries.
Successful adapters become optional first-party integrations.
```

具体推荐：

1. **Indirection：积极合作，最高优先级。**
2. **InputFlow：Sinan 先自研最小 contract，再合作外设/replay/rebind。**
3. **ViewRig：Sinan 保留 CameraShot/Director，相机高级 rig 合作。**
4. **LudoWeave：不替换 React Editor，只做 Runtime UI 小 POC。**
5. **Inscape：作为外部 narrative pipeline，不进 engine core，先做 dry-run importer。**

这个策略可以让 Sinan 既保持引擎架构主权，又借助合作方把专门领域做得更深。
