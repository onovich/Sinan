# RFC-002：Sinan Input Context

> 状态：Draft for alignment
> 日期：2026-06-20
> 关联战略：`docs/strategy/external-infrastructure-cooperation-strategic-decision.md`
> 适用合作方：InputFlow / 输入控制系统

---

## 1. 摘要

Sinan Engine 将输入系统划分为两层：

```txt
Sinan Input Contract
  action names, input contexts, InputMap schema, EngineLoop integration, World/Event mapping

Input Backend / Partner Implementation
  browser raw input, gamepad, touch, rebind, virtual replay, diagnostics
```

Sinan 必须先自研最小 InputSystem contract，确保引擎主线不等待外部项目成熟。InputFlow 可以作为 raw input、rebind、virtual replay 和 diagnostics backend 接入，但不能定义 Sinan gameplay/editor 语义。

## 2. 背景

Sinan 当前输入主要散落在 editor viewport、picking、gizmo 和 runtime interaction 中。随着 Showcase Mode、player control、interaction、pause menu、runtime UI 和 gameplay camera 进入路线，输入必须成为 first-party engine system。

输入系统如果处理不好，会污染：

- editor/gameplay mode 切换。
- modal / panel / text editing focus。
- pointer picking。
- camera control。
- replay/smoke tests。
- AI 自动验证。

因此需要先定义 Sinan 输入语义，再选择 backend。

## 3. 目标

本 RFC 定义：

- Sinan input action 和 context 模型。
- `InputMap` 作为可验证数据的边界。
- Browser/InputFlow backend 的职责。
- Gate Demo / Showcase POC 验收标准。

## 4. 非目标

本 RFC 不做：

- 不一次性替换所有 editor 快捷键。
- 不实现完整 rebinding UI。
- 不实现 mobile virtual joystick。
- 不实现完整 accessibility navigation。
- 不让 InputFlow 成为 Sinan hard dependency。

## 5. 核心概念

### 5.1 InputAction

Sinan 公开语义动作。

示例：

```txt
runtime.gameplay.interact
runtime.gameplay.move
runtime.gameplay.look
runtime.gameplay.pause
editor.viewport.select
editor.viewport.orbit
editor.command.save
ui.confirm
ui.cancel
```

规则：

- action name 由 Sinan 定义。
- action name 可以被 InputFlow 绑定，但不能由 InputFlow 私自扩展为 Sinan 事实源。
- action 只表达用户意图，不直接修改 World。

### 5.2 InputContext

输入上下文用于解决同一个按键在不同模式下的含义。

建议初始上下文：

```txt
textEditing
modal
editorPanel
editorViewport
runtimeMenu
runtimeGameplay
global
```

优先级从高到低：

```txt
textEditing > modal > editorPanel > runtimeMenu > editorViewport > runtimeGameplay > global
```

规则：

- context priority 由 Sinan 保留。
- 外部 backend 只能报告可用输入和 action state。
- React panel 可以影响当前 context，但不承载高频输入状态。

### 5.3 InputSnapshot

每帧稳定输入快照。

职责：

- 给 EngineLoop 查询。
- 给 EventSystem / WorldQuery / CameraSystem 使用。
- 给 replay 和 tests 使用。

快照应包含：

- pressed / held / released。
- axis value。
- pointer state。
- timestamp / frame index。
- active context。

### 5.4 InputMap

可序列化输入映射。

第一阶段可以放在：

```txt
data/inputMaps/default.json
```

示例草案：

```json
{
  "id": "default",
  "bindings": [
    {
      "action": "runtime.gameplay.interact",
      "context": "runtimeGameplay",
      "inputs": ["KeyboardE", "PointerPrimary", "GamepadSouth"]
    }
  ]
}
```

规则：

- InputMap 必须有 schema。
- override 不直接写回 source-of-truth，除非用户明确保存 project settings。
- InputMap 不包含任意脚本。

### 5.5 VirtualInputSource

测试与 replay 输入源。

用途：

- Vitest deterministic tests。
- Playwright smoke。
- AI 自动验证。
- Showcase interaction recording。

## 6. EngineLoop 集成

推荐顺序：

```txt
Browser/InputFlow backend collects raw input
  -> InputSystem.beginFrame()
  -> InputSystem resolves active context
  -> InputSystem produces InputSnapshot
  -> WorldQuery / EventSystem / CameraSystem consume snapshot
  -> Actions mutate World/Director/UI through registries
  -> Runtime adapters apply results
```

Input backend 不直接：

- 调用 EventSystem action。
- 修改 World transform。
- 操作 Three.Camera。
- 修改 editor store。

## 7. InputFlow POC Plan

### POC-1：Sinan Minimal Contract

Sinan 自研：

- `InputAction`
- `InputContext`
- `InputSnapshot`
- `InputMap` schema
- `BrowserInputAdapter`
- `VirtualInputSource`

验收：

- 单元测试覆盖 action resolution。
- editor/gameplay context 可区分。
- 无 Three/React 热路径依赖。

### POC-2：InputFlow Backend Adapter

InputFlow 提供：

- keyboard / pointer raw source。
- gamepad south button draft。
- virtual replay source。

验收：

- `runtime.gameplay.interact` 可从 `E`、Pointer Primary、Gamepad South 触发。
- modal 打开时 gameplay interact 被屏蔽。
- virtual replay 可稳定复现一次 Gate interaction。

### POC-3：Editor / Gameplay Isolation

验收：

- editor viewport select 不触发 runtime interact。
- text editing 时 global shortcuts 不误触。
- browser blur 后 held state reset。

## 8. 验收标准

Input backend 进入 Sinan 主线前必须满足：

- 不接管 Sinan action 命名。
- 不接管 context priority。
- 不直接操作 World/Event/Director/Three。
- 有 replay 或 deterministic fixture。
- 有 blur/focus reset。
- 有 diagnostics。
- 有 Gate Demo 或 Showcase smoke。
- Sinan 内置 fallback 可继续运行。

## 9. 拒绝方案

拒绝：

- 在 React component 中保存高频 gameplay input state。
- 在 raw DOM event handler 中直接执行 gameplay action。
- 让 InputFlow 定义 Sinan EngineMode。
- 把 pointer picking 放进 InputFlow core。
- 直接把外部 binding override 写回项目 source-of-truth。

## 10. Open Questions

- `data/inputMaps/default.json` 是否属于 project data，还是 user preference？
- 是否需要 `InputProfile` 区分 keyboard/mouse、gamepad、touch？
- Replay 文件是否应进入 `tests/fixtures/input-replay`？
- 输入 diagnostics 在 editor 中显示在哪个 panel？
