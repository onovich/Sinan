# RFC-004：Sinan Camera Pose / Shot / Rig Boundary

> 状态：Draft for alignment
> 日期：2026-06-20
> 关联战略：`docs/strategy/external-infrastructure-cooperation-strategic-decision.md`
> 适用合作方：ViewRig / 相机控制与高级 rig 系统

---

## 1. 摘要

Sinan Engine 将相机系统划分为三层：

```txt
Sinan Camera Contract
  cameraShots, DirectorCameraSystem, Timeline camera track, preview/scrub/restore, editor commands

Camera Rig / Solver Backend
  follow, orbit, third-person, rail, composer, blend, shake, collision, constraints

Runtime Camera Adapter
  WebRuntime.setCameraPose, Three camera write, editor viewport camera, debug visualization
```

Sinan 必须保留 CameraShot 和 Director camera 的 source-of-truth。ViewRig 或其他相机项目可以提供高级 rig、pose solver、blend/composer、collision/occlusion 和 debug visualization，但不能替代 Sinan 的 `cameraShots/*.json`、Timeline camera track 或 DirectorCameraSystem。

## 2. 背景

Sinan 当前已有：

- `data/cameraShots/*.json`
- CameraShot schema
- CameraShotPlayer
- DirectorCameraSystem
- Timeline camera track
- editor CameraShotPanel
- `WebRuntime.setCameraPose`

这些能力是 Sinan Director System 的核心差异点。与此同时，高级相机控制是专门领域：third-person rig、follow/orbit、rail/path、collision avoidance、confiner、screen composer、shake 和 blend 都有大量手感细节。

因此，Sinan 不应把 CameraShot/Director 语义外包，但可以与 ViewRig 合作高级 rig/solver。

## 3. 目标

本 RFC 定义：

- Sinan 相机 source-of-truth。
- ViewRig 能接入的位置。
- CameraShot、gameplay camera、editor camera 的边界。
- 首批 ViewRig POC 验收标准。

## 4. 非目标

本 RFC 不做：

- 不替换 `data/cameraShots/*.json`。
- 不重写 CameraShotPlayer。
- 不让 ViewRig 接管 DirectorSystem。
- 不让 ViewRig 直接读写 Three.Camera。
- 不把 ViewRig runtime state 保存为 Sinan source-of-truth。
- 不一次性实现完整 Cinemachine-like 相机生态。

## 5. Source Of Truth

Sinan 相机事实源包括：

```txt
data/cameraShots/*.json
data/timelines/*.json camera tracks
CameraShot schema
Editor commands for CameraShot edits
DirectorCameraSystem state rules
```

规则：

- Timeline camera track 引用 Sinan cameraShot id。
- Editor 保存 camera shot 时写回 Sinan JSON。
- ViewRig config 如果需要持久化，必须映射为 Sinan schema 扩展，而不是保存 ViewRig 私有 runtime state。
- Runtime pose 不是 authoring source-of-truth。

## 6. 核心概念

### 6.1 CameraShot

Sinan 的可编辑镜头数据。

职责：

- 定义 static、keyframed、follow、lookAt、rail 等 shot 语义。
- 可被 Timeline track 引用。
- 可被 editor panel 修改。
- 可被 DirectorCameraSystem 播放、scrub、preview。

### 6.2 RuntimeCameraPose

每帧下发给 runtime adapter 的相机姿态。

示例字段：

```txt
position
target / rotation
fov
near / far
blend weight
debug metadata
```

规则：

- RuntimeCameraPose 可以由 Sinan CameraShotPlayer 生成，也可以由 ViewRig solver 生成。
- RuntimeCameraPose 通过 `WebRuntime.setCameraPose` 或相同层级 adapter 下发。
- RuntimeCameraPose 不保存进 JSON。

### 6.3 CameraRig

高级相机行为单元。

示例：

```txt
followRig
orbitRig
thirdPersonRig
railRig
screenComposer
collisionAvoidance
cameraShake
confiner
```

规则：

- Rig 算法可以来自 ViewRig。
- Rig 输入来自 Sinan World/Physics/Input/CameraShot contract。
- Rig 输出 RuntimeCameraPose。
- Rig 不直接操作 Three.Camera。

### 6.4 WorldProbe

相机碰撞、遮挡、confiner 所需的世界查询接口。

规则：

- WorldProbe 由 Sinan physics/world adapter 提供。
- ViewRig core 只能依赖 probe interface。
- ViewRig core 不能 import Rapier、Three 或 Sinan editor store。

## 7. 接入边界

推荐数据流：

```txt
CameraShot JSON / gameplay camera intent
  -> Sinan CameraSystem / DirectorCameraSystem
  -> optional ViewRig solver
  -> RuntimeCameraPose
  -> WebRuntime.setCameraPose
  -> Three camera adapter
```

Sinan 保留：

- CameraShot schema。
- CameraShotPlayer。
- DirectorCameraSystem。
- Timeline camera track。
- scrub/preview/restore 规则。
- editor command/save/undo。
- gameplay mode camera ownership。

ViewRig 可提供：

- follow/orbit/third-person solver。
- rail/path sampling。
- composer/dead zone/soft zone。
- camera collision/occlusion/confiner。
- blend/shake utilities。
- debug visualization data。

## 8. POC Plan

### POC-1：Pose Solver Spike

目标：不改 CameraShotPlayer，只验证 ViewRig 能输出 RuntimeCameraPose。

切片：

- 输入一个 target entity pose。
- 输入 yaw/pitch/distance 或 rail progress。
- 输出 RuntimeCameraPose。
- 通过 test fixture 校验 pose。

验收：

- ViewRig core 不依赖 Three。
- Sinan adapter 可拔除。
- RuntimeCameraPose 可 snapshot。

### POC-2：Showcase Follow / Orbit Camera

目标：为 Showcase Mode player control 提供 follow/orbit camera。

切片：

- InputSystem 提供 look/orbit intent。
- World 提供 player transform。
- ViewRig solver 输出 camera pose。
- Sinan 通过 `WebRuntime.setCameraPose` 应用。

验收：

- editor camera 不受影响。
- gameplay camera 可启停。
- browser smoke 中 camera pose 变化可见。

### POC-3：CameraShot Enhancement

目标：让 Sinan CameraShot 可选择使用 ViewRig blend/composer/rail algorithm。

切片：

- 扩展某个 non-breaking cameraShot option。
- `cam_gate_reveal` 或新 demo shot 使用 ViewRig algorithm。
- 数据仍保存为 Sinan cameraShot JSON。

验收：

- Timeline scrub 可预测。
- restore camera 规则不变。
- ViewRig 私有 state 不进入 JSON。

### POC-4：Collision / Confiner

目标：使用 Sinan WorldProbe/PhysicsProbe 完成 camera collision 或 confiner。

验收：

- ViewRig core 只依赖 probe interface。
- Three/Rapier 具体实现位于 adapter。
- 没有 physics hard dependency 时 fallback 正常。

## 9. 验收标准

ViewRig adapter 或相机 backend 进入 Sinan 主线前必须满足：

- 不替代 `data/cameraShots/*.json`。
- 不替代 CameraShotPlayer 或 DirectorCameraSystem。
- 不直接操作 Three.Camera。
- 不把 runtime rig state 保存为 Sinan source-of-truth。
- 有 deterministic pose tests。
- 有 editor/play mode 隔离测试。
- 有 browser smoke 或 screenshot evidence。
- Sinan 内置 camera path 可继续运行。

## 10. 拒绝方案

拒绝：

- 把 CameraShot JSON 替换成 ViewRig 私有配置。
- 让 ViewRig 接管 DirectorSystem。
- 让 ViewRig 直接读取 `THREE.Camera` 或 `THREE.Object3D`。
- 让 editor camera、gameplay camera、director camera 共用未分层的 mutable state。
- POC 未通过就删除 Sinan 现有 CameraShotPlayer。

## 11. Open Questions

- ViewRig adapter 放在 Sinan repo 内部，还是外部 `@viewrig/sinan` package？
- Camera rig 持久化应扩展 `cameraShot.schema.ts`，还是新增 `cameraRig.schema.ts`？
- Gameplay camera 是否独立于 DirectorCameraSystem，还是作为 Director camera 的低优先级 source？
- Camera debug overlay 应属于 `src/editor/**`、`src/camera/**` 还是 runtime adapter？
