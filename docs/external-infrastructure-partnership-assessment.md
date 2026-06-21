# Sinan Engine 外部基础设施合作评估

日期：2026-06-20

## 0. 结论摘要

Sinan 已经从原先的 Scene Director 升级为 AI-native、data-first、Web 原生的 3D 游戏引擎与编辑器。这个定位变化会显著改变外部合作判断：输入、相机、资源加载、UI、叙事 DSL 不再只是“可选周边库”，而是未来 Sinan Engine 的 first-party engine systems 或 authoring systems 候选。

总体建议：

1. **不要选择完全封闭自研。** 输入、资源、UI、相机、叙事工具链都是长期投入型基础设施，完全自研会让 Sinan 的核心路线被横向系统拖慢。
2. **也不要现在说服这些项目直接并入 Sinan。** 它们仍处超早期，贸然合并会把治理、品牌、版本、API 稳定和维护责任一次性压到 Sinan 身上。
3. **最优策略是“第一方设计伙伴 + 宿主 POC + adapter/contract 先行”。** Sinan 提供真实宿主、数据边界、验收标准和路线牵引；外部项目保持独立 core 与包治理；双方用 Sinan Gate Demo、后续 Showcase Mode 和 contract tests 证明价值。
4. **未来可以保留打包为 Sinan Engine Infrastructure Kit 的选择权。** 先以独立包、官方 adapter、兼容矩阵和联合 demo 建立事实标准，再决定是否品牌合并、组织合并或 npm scope 统一。

一句话判断：**合作值得做，而且比完全自研更有战略性价比；但合作方式应是 Sinan 主导标准和首个真实落地场景，而不是立即收编成单体引擎仓库。**

## 1. 文档隔离状态

四份外来项目文档已移动到隔离目录：

- `docs/external-projects/indirection/`
- `docs/external-projects/inputflow/`
- `docs/external-projects/ludoweave/`
- `docs/external-projects/viewrig/`

隔离目录包含 `docs/external-projects/README.md`，明确这些文件是外部项目参考资料，不是 Sinan 自身 source-of-truth。后续 AI 不应把外部方案中的架构、API、路线或约束直接当作 Sinan 规范，除非 Sinan 自有文档明确采纳。

`LudoWeave` 原始文件为 `.docx`，已在同目录抽取出 `.extracted.md` 供分析使用。

## 2. 当前 Sinan 背景

这次评估基于 Sinan 的最新引擎定位，而不是旧的 Scene Director 定位。

已确认的当前状态：

- README 已定义 Sinan Engine 是 AI-native、data-first 的 Web 3D game engine and editor。
- 原 Scene Director 范围已变成一等 Director System，负责 events、conditions、actions、timelines、camera shots、animation cues 和 cinematic flow。
- Phase 18.5 已完成 `EngineSession`、`EngineLoop`、最小 `World`、`EditorSessionBridge`，编辑器不再是运行闭环唯一根。
- Phase 19 已完成 production story material、material timeline、material action、Material Inspector MVP 和浏览器 smoke。
- Sinan 仍缺少完整 first-party `src/assets/**`、`src/input/**`、`src/ui/**`、`src/physics/**`、更强相机 runtime，以及叙事脚本/剧情 authoring 子系统。

这意味着外部项目的价值不只是“能帮 Sinan 少写一点代码”，而是有机会成为 Sinan Engine 的生态系统边界：资源系统、输入系统、相机系统、游戏 UI 系统、叙事 authoring 系统。

## 3. 自研、合作、并入三种路线比较

| 路线 | 优点 | 风险 | 适用结论 |
| --- | --- | --- | --- |
| 完全自研 | 控制力最高；短期接口可按 Sinan 需要快速写；无外部协调成本 | 横向系统太多，会稀释 Sinan 的核心差异化；重复造轮子；后续维护面巨大 | 不推荐作为总策略，只适合做最小内置 fallback |
| 独立合作 + Sinan 第一方宿主 | 保留外部项目跨引擎价值；Sinan 获得真实影响力和早期定制权；风险可分阶段控制 | 需要 Sinan 投入架构指导、contract tests、POC 和版本协调 | 推荐作为主策略 |
| 直接并入 Sinan | 品牌统一；决策快；可打包成“一套引擎”叙事 | 过早承担未成熟项目的全部维护责任；core 易被 Sinan 过拟合；合作方失去独立动力 | 暂不推荐，仅作为 POC 成功后的远期选项 |

商务上最关键的点是：**如果对方还在超早期，Sinan 作为第一方合作者确实需要投入指导成本；但这个成本不应被视为额外负担，而应视为抢占接口标准、影响路线和形成生态壁垒的投入。**

前提是我们必须把合作限制在可验收的小切片里，不能让它变成无限技术顾问服务。

## 4. 单项评估

### 4.1 Indirection：资源寻址与加载

外部定位：Web 游戏资源寻址与加载系统，强调 identity over location、authoring manifest 与 compiled catalog 分离、build-time strict/runtime lean、显式 ownership、adapter not invasion。

与 Sinan 契合度：**极高。**

原因：

- Sinan 已有 `data/assets.manifest.json`、asset metadata、asset report、Three runtime loader、压缩加载策略和预算校验路线。
- Indirection 文档主动设计了 Sinan 集成路径，包括 manifest importer、模型加载接管、scene scope/group preload、compressed variant。
- 它的核心边界与 Sinan 一致：core 不依赖 Three、React、Zod、Vite；Three 和 Sinan 都在 adapter 层。
- 资源系统是引擎底座。Sinan 自己做一个能用的 asset loader 不难，但长期做好 variant、依赖、缓存、释放、错误模型、报告和压缩策略成本很高。

自研 vs 合作：

- 完全自研短期更快，但会在 Phase 20 以后逐渐变成大维护项。
- 合作更合算，尤其是 Sinan 已经有真实 asset pipeline 和 smoke，可以成为 Indirection 的首个强约束 POC。

指导成本判断：**高但值得。**

我们需要指导它守住：

- compiled catalog 不取代 Sinan authoring manifest。
- resource ownership/dispose 与 Three adapter 边界。
- fallback 和错误码可测试。
- 不把 Sinan 特例写进 core。

推荐策略：

- 优先合作。
- 第一阶段只接 build/report/compiler，不立刻替换 runtime。
- 第二阶段接管 `WebRuntime.loadModel(assetId, url)` 背后的加载路径。
- 第三阶段再做 group preload、variant、compressed asset。

商务判断：**这是最值得优先推进的合作对象。** 它离 Sinan 近期路线最近，也最容易形成“Sinan Engine 有严肃资源管线”的对外证据。

### 4.2 InputFlow：输入控制系统

外部定位：把 keyboard、pointer、touch、gamepad 等低层输入转换为可查询、可路由、可重绑定、可录制回放的语义 action。

与 Sinan 契合度：**高。**

原因：

- Sinan 目前还没有 first-party InputSystem，输入仍主要散落在 editor viewport、gizmo、runtime interaction 和未来 gameplay 计划中。
- InputFlow 的设计原则非常符合 Sinan：宿主拥有 loop、pull 为主 event 为辅、配置与运行时状态分离、不用隐式全局单例、React 只做低频投影。
- 它已经写了 Sinan 推荐优先级、Sinan adapter 归属、`data/inputMaps/*.json`、Gate Demo POC。
- 输入系统一旦写坏，会污染 editor/gameplay focus、modal、快捷键、虚拟回放和 Playwright smoke。

自研 vs 合作：

- Sinan 自研一个轻量 input map 是可行的，短期成本低。
- 但完整做到 context priority、focus policy、gamepad、touch、rebind、replay、diagnostics，会变成长期系统。
- InputFlow 如果能按文档落地，合作收益大于自研。

指导成本判断：**中高，值得。**

我们需要给它明确的 Sinan 约束：

- EngineSession/EngineLoop 每帧调用 input core。
- editor input、runtime gameplay input、modal/panel input 必须分层。
- pointer picking 和 world ray 由 Sinan runtime/world 执行，InputFlow 只提供语义输入。
- React 不进入热路径。

推荐策略：

- 合作，但不要等它完整成熟才接入。
- Sinan 可以先定义自己的最小 `InputSystem` façade，再让 InputFlow 作为实现候选。
- POC 只做 `interact`、`select`、modal isolation 和 virtual replay，不一次性迁移所有快捷键。

商务判断：**值得成为第二优先级合作对象。** 它能直接支撑 Phase 20+ 的 Showcase Mode 和 gameplay input，但需要严格控制 POC 范围。

### 4.3 ViewRig：相机控制方案

外部定位：类似 Cinemachine 思路的 TypeScript 相机控制核心，提供 VirtualCamera、CameraBrain、Rig、Aim、Composer、Constraint、WorldProbe、Blend 等概念，使用 Ports and Adapters 架构。

与 Sinan 契合度：**中高。**

原因：

- Sinan 已有 `CameraShotPlayer`、`DirectorCameraSystem`、timeline camera track 和 editor camera control。
- ViewRig 比 Sinan 当前 camera shot 更像完整 camera behavior runtime，适合 first-person、third-person、orbit、rail、composer、dead/soft/hard zone、collision/confiner。
- 它强调 core 不依赖 Three/DOM/物理，adapter 只写结果到具体引擎，这与 Sinan 一致。

自研 vs 合作：

- Sinan 自己保留现有 CameraShot/DirectorCameraSystem 是必要的，因为它是 Director System 的核心语义。
- 但更复杂的 runtime camera rig、follow camera、collision、composer、blend 可以合作，不必全自研。
- ViewRig 还没有明显写出 Sinan-specific integration plan，相比 Indirection/InputFlow/LudoWeave，它的 Sinan 对接需要我们更多主动设计。

指导成本判断：**中等，条件性值得。**

我们需要指导它：

- 不取代 Sinan 的 `cameraShots/*.json`，而是成为 camera behavior sampler/solver。
- 和 DirectorCameraSystem 对接：Sinan 仍拥有 shot 数据、timeline、mode、blend intent；ViewRig 负责 rig 计算和 pose 输出。
- WorldProbe/collision 走 Sinan physics/world adapter，不直接 raycast Three。
- Editor camera 与 gameplay camera 要区分。

推荐策略：

- 合作但不作为第一优先级。
- 先做一个 `ViewRigAdapter` spike：用 ViewRig 计算 follow/orbit/rail pose，再通过 `WebRuntime.setCameraPose` 应用。
- 不要马上重写 `CameraShotPlayer`。

商务判断：**适合高展示价值 demo，但不是最紧急底座。** 如果对方团队执行力强，可以作为“Sinan camera runtime partner”；如果执行力一般，Sinan 应继续自研基础 camera shot。

### 4.4 LudoWeave：游戏 UI 框架

外部定位：独立横向游戏 UI 基础设施，core 不依赖 React、Three、Pixi、Phaser、Cocos、Unity 或 Sinan；提供 headless、DOM、Canvas2D、后续 Pixi/WebGL adapter；强调 UiNode、ResolvedUiFrame、ActionRef、renderer conformance、accessibility、gamepad navigation。

与 Sinan 契合度：**高，但风险也高。**

原因：

- Sinan 当前 UI 主要是 React editor panels；runtime UI 还没有成为一等 `src/ui/**` 系统。
- LudoWeave 的目标正好覆盖 Runtime UI、HUD、Subtitle、Prompt、Objective、Pause Menu，以及后续游戏 UI。
- 文档非常明确地反对并入 Sinan core，建议 `@ludoweave/sinan` adapter，这个边界健康。
- 它对 ActionRef、action log、headless renderer、renderer conformance、DOM/a11y 的关注，有利于 AI-friendly UI。

自研 vs 合作：

- Sinan 自研一个 React HUD 很容易，但那会让 Runtime UI 和 Editor UI 混在一起，长期不利。
- LudoWeave 的设计雄心较大，真正落地成本高，且游戏 UI 框架比输入/资源更容易范围膨胀。
- 合作比完全自研更有长期价值，但 POC 必须非常窄。

指导成本判断：**高，值得但必须设边界。**

我们需要指导它：

- Sinan 保留项目 JSON、schema、command、undo/redo、dirty/save、RuntimeUI system。
- LudoWeave 只消费 ViewModel、发 ActionRef，不直接改 Sinan editor store 或项目数据。
- 第一阶段只做 Gate Demo Runtime UI：Prompt、Subtitle、Objective、Pause。
- 不重写 Sinan React 编辑器，不动 docking/timeline/inspector 主体。
- 同一组件必须能在 Standalone Playground 运行，避免过拟合 Sinan。

推荐策略：

- 合作，但从 runtime UI 开始，不从 editor UI 开始。
- 等 Prompt/Subtitle/Objective/Pause 通过后，再考虑局部 editor panel，比如 AssetPanel 或 CameraShotPanel。

商务判断：**战略价值高，但需要最强治理。** 它能让 Sinan 在“游戏 UI 不是 React 面板堆叠”上占住长期优势，但如果失控，会吞掉大量产品和测试资源。

### 4.5 Inscape：叙事 DSL、编译器与作者工具链

定位：以 `.inscape` 文本 DSL 为源数据的叙事编译链与作者工具体系，包含 Compiler、Tooling、LanguageServer、Runtime、VSCode、SelfHostedEditor、UnityPlugin/Engine Adapter。

与 Sinan 契合度：**高，但属于垂直 authoring/toolchain，不是通用 engine core 模块。**

原因：

- Sinan 是 Web 3D 游戏引擎与编辑器，未来 Abeto-like / Messenger-like vertical slice 很可能需要剧情文本、分支叙事、本地化、host events、runtime preview。
- Inscape 已经比四个外部方案成熟：P5 SelfHostedEditor Runtime authoring/productization 已 PASS，有 Runtime-backed Preview、Host Schema/Bridge、Mock Query、Runtime Actions、Substate、Log/Backlog、Branch Receipts 等能力。
- Inscape 的边界语言非常成熟：Internal 是共享真相，ExternalSupport 是宿主胶水；Compiler 不绑定 Unity/VSCode/SelfHostedEditor/HTML。
- 它与 Sinan 的关系应类似“叙事内容 authoring 子系统 + importer/runtime bridge”，而不是 input/camera/assets/UI 这种 engine subsystem。

自研 vs 合作：

- Sinan 自己做剧情脚本 DSL 与本地化管线的成本很高，而且会偏离 engine core。
- Inscape 已经有大量 compiler/tooling/editor 基础，合作明显优于重写。
- 但不能把 Inscape 直接并入 Sinan Engine core，否则会把 C#/.NET、SelfHostedEditor、VSCode/Unity 历史包袱带进 Sinan。

指导成本判断：**中等偏低。**

Inscape 已经有自己的架构纪律和验证矩阵，不需要 Sinan 从零指导；Sinan 需要提供的是 engine-side resource catalog、host schema、host bridge、runtime/importer contract。

推荐策略：

- 把 Inscape 作为 Sinan 的 narrative authoring partner。
- 第一阶段做静态 dry-run：Inscape sample -> graph/manifest/localization CSV -> Sinan importer report。
- 第二阶段让 Sinan 导出 resource catalog、event/action/query catalog 给 Inscape Host Schema/Bridge。
- 第三阶段再考虑 Runtime/live preview 对接。
- 不把 Inscape 纳入 Sinan npm/web runtime core；可建立 `sinan-inscape-bridge` 或 importer。

商务判断：**高度值得合作，但不应作为“引擎基础设施四件套”的同一合并对象。** 它是内容生产链路伙伴，最好保持独立项目与明确桥接。

## 5. 综合优先级

| 优先级 | 项目 | 合作建议 | 理由 |
| --- | --- | --- | --- |
| P0 | Indirection | 立即推进 POC | 与资源预算、压缩、加载、报告直接相关，Sinan 近期路线最需要 |
| P1 | InputFlow | 近期推进 POC | Sinan 缺 first-party input，Showcase/gameplay 前置 |
| P1 | Inscape | 开始静态交换/dry-run | 成熟度最高，适合叙事 authoring 合作，但不进 engine core |
| P2 | LudoWeave | 窄 POC，runtime UI 先行 | 战略价值高但范围风险大 |
| P2 | ViewRig | Spike/技术验证 | 展示价值高，但 Sinan 已有 director camera 基线 |

如果只能投入一个合作窗口，选 **Indirection**。

如果可以并行两个，选 **Indirection + InputFlow**。

如果希望做对外展示型联合 demo，选 **ViewRig 或 LudoWeave**。

如果希望补剧情 authoring 与本地化，选 **Inscape**。

## 6. 是否有必要说服他们加入 Sinan，共同打包成游戏引擎基础设施？

短期不建议用“加入我们/并入我们”作为话术。

更合适的商务表达是：

> Sinan Engine 正在形成 AI-native Web game infrastructure。我们希望你们成为第一批 first-party design partners。Sinan 提供真实宿主、集成场景、验收标准、自动化测试和长期路线牵引；你们保持独立 core 和公共 API。双方先用官方 adapter、兼容矩阵和联合 demo 证明价值。POC 成功后，再讨论联合品牌、套件打包、scope 统一或更深层组织合作。

原因：

- 这些项目都反复强调 core 独立和 adapter 接入。直接要求并入，会违背它们当前设计共识。
- 超早期项目合并会制造大量组织成本，却不一定提升交付速度。
- Sinan 作为引擎项目，需要控制产品边界；如果把四个大系统都吞进来，短期会变成“管理五个创业项目”。
- 独立项目若能围绕 Sinan 形成事实标准，Sinan 反而获得更大生态号召力。

可以设计一个中期打包形态：

```text
Sinan Engine Infrastructure Kit

sinan-engine
  first-party engine/editor/runtime

official adapters:
  @indirection/sinan 或 src/assets/indirection-adapter
  @inputflow/sinan 或 src/input/inputflow-adapter
  @viewrig/sinan 或 src/camera/viewrig-adapter
  @ludoweave/sinan 或 src/ui/ludoweave-adapter
  sinan-inscape-bridge / importer

shared gates:
  Sinan Gate Demo
  Showcase Mode vertical slice
  contract tests
  Playwright smoke
  compatibility matrix
```

这个形态可以对外讲成“Sinan-compatible AI-friendly Web Game Infrastructure”，但底层仍保持独立包与清晰 adapter。

## 7. Sinan 作为第一方合作者要提供什么

如果要让合作有性价比，Sinan 必须提供清晰、可复用、不会每周变的宿主契约。

建议优先准备：

- Engine capability brief：EngineSession、World、RuntimeAdapter、Director、MaterialRuntime、DataRepository 的稳定边界。
- Resource catalog/export draft：给 Indirection 和 Inscape 使用。
- Input context/focus policy draft：给 InputFlow 和 LudoWeave 使用。
- Runtime UI ViewModel draft：给 LudoWeave 使用。
- Camera pose/shot/rig boundary draft：给 ViewRig 使用。
- Host Schema / Host Bridge / Action catalog draft：给 Inscape 使用。
- 合作 POC 验收矩阵：unit tests、data validation、boundary check、smoke、fallback/error behavior。

同时，Sinan 需要设立合作红线：

- 外部 core 不能 import Sinan 内部 store、Three runtime、React editor state。
- Sinan 数据事实源不能被外部 GUI hidden state 替代。
- 所有合作都必须有 dry-run/report 或 deterministic fallback。
- POC 未通过前，不进入 Sinan roadmap 的 hard dependency。
- adapter 可以第一方维护，core 不应被 Sinan 特例污染。

## 8. 建议谈判/合作节奏

### 阶段 A：非排他设计伙伴

目标：低承诺启动合作。

产物：

- 双方确认领域边界。
- 一页 RFC：接口、非目标、验收、谁维护 adapter。
- Sinan 给出最小宿主契约。
- 对方给出最小 core API 或 schema draft。

### 阶段 B：Gate Demo POC

目标：用真实场景证明能跑。

建议切片：

- Indirection：manifest importer + asset report + model loading fallback。
- InputFlow：`interact` / `select` / modal isolation / virtual replay。
- ViewRig：follow/orbit/rail pose spike，不重写 CameraShotPlayer。
- LudoWeave：Prompt / Subtitle / Objective / Pause runtime UI。
- Inscape：sample graph/localization -> Sinan importer dry-run report。

### 阶段 C：官方 adapter 与兼容矩阵

目标：从 demo 变成可持续集成。

产物：

- adapter package 或 Sinan 内部 adapter module。
- contract tests。
- compatibility matrix。
- release notes。
- documentation。

### 阶段 D：联合打包或深度整合

触发条件：

- 至少两个版本兼容。
- POC 已进入 Sinan 主线或 Showcase Mode。
- core 在非 Sinan 示例中也能工作。
- 维护责任、license、scope、versioning 和品牌都谈清楚。

这一步才讨论是否共同打包成引擎基础设施套件，甚至是否组织/仓库层面合并。

## 9. 商务风险

### 9.1 我们投入指导，对方未能交付

缓解：

- 每个项目只给一个小 POC 切片。
- 指导以公开 RFC/issue/contract test 形式沉淀，不做无限口头顾问。
- POC 未过不进入 hard dependency。

### 9.2 对方被 Sinan 过拟合，失去独立性

缓解：

- 要求至少一个 standalone demo。
- core import graph 禁止 Sinan/React/Three editor store。
- Sinan 专用逻辑放 adapter。

### 9.3 合作后 Sinan 被外部 roadmap 绑架

缓解：

- Sinan 保留内置 fallback 或 façade。
- 官方 adapter 版本锁定。
- 外部项目延期时，Sinan 可以继续推进最小自研实现。

### 9.4 “引擎套件”叙事过早，市场预期过高

缓解：

- 对外先称 first-party design partner / compatible infrastructure。
- 等 POC 和兼容矩阵真实存在后，再发布 umbrella narrative。

## 10. 推荐决策

### 10.1 是否完全自研？

不建议。

Sinan 应自研最小 façade 和 fallback，确保不被合作方卡死；但完整资源加载、输入、UI、相机、叙事 authoring 都完全自研，会让 Sinan 从引擎项目变成基础设施集合研发项目，速度和聚焦都会下降。

### 10.2 是否合作？

建议合作。

这些项目的文档质量和架构价值观与 Sinan 高度一致：TypeScript/Web、AI-friendly、data/schema/adapter、测试、可观测性、独立 core、Sinan first host。即使它们还早期，作为第一方合作者投入指导是有性价比的，因为 Sinan 可以用较小成本影响接口标准。

### 10.3 是否说服直接加入/合并？

现在不建议。

先合作，后整合。用真实 POC、adapter、compatibility matrix、joint demo 证明价值。合并应该是结果，不是开场条件。

### 10.4 下一步建议

1. 对 Indirection 发起 POC：manifest importer + report + fallback loader。
2. 对 InputFlow 发起 POC：InputMap + interact/select + replay。
3. 对 Inscape 发起静态 dry-run：Inscape sample -> Sinan importer report。
4. 对 LudoWeave 只定义 Runtime UI ViewModel RFC，不急着实现。
5. 对 ViewRig 做技术 spike 前先写 Sinan camera boundary RFC。

这五步可以同时保护两件事：Sinan 不闭门重复造轮子，也不被超早期合作项目拖入不可控合并。
