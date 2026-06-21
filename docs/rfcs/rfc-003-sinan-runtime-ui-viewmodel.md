# RFC-003：Sinan Runtime UI ViewModel

> 状态：Draft for alignment
> 日期：2026-06-20
> 关联战略：`docs/strategy/external-infrastructure-cooperation-strategic-decision.md`
> 适用合作方：LudoWeave / Runtime UI 框架

---

## 1. 摘要

Sinan Engine 将 UI 分为两类：

```txt
Editor UI
  React editor shell, panels, inspector, timeline, asset panel, command/save/undo

Runtime UI
  HUD, prompt, subtitle, objective, pause menu, dialogue, gameplay overlays
```

Editor UI 继续使用 React，不替换根框架。Runtime UI 需要成为 first-party engine system，并通过 ViewModel + ActionRef + renderer adapter 接入 LudoWeave 或其他 UI runtime。

## 2. 背景

Sinan 当前 UI 主要是 React editor。随着引擎进入 Showcase gameplay，runtime UI 会承担：

- interact prompt。
- subtitle。
- objective / delivery job。
- pause menu。
- dialogue。
- route / target feedback。
- gamepad focus。

如果这些都继续写成临时 React overlay，Editor UI 和 Runtime UI 会混杂。长期看，这会削弱 Sinan 的 engine boundary、AI 可验证性和多运行模式能力。

## 3. 目标

本 RFC 定义：

- Runtime UI 的 source-of-truth。
- ViewModel 和 ActionRef contract。
- LudoWeave 可接入的位置。
- Prompt / Subtitle / Objective / Pause POC 验收标准。

## 4. 非目标

本 RFC 不做：

- 不替换 Sinan React Editor。
- 不重写 docking、Inspector、Timeline、AssetPanel。
- 不实现完整 UI layout engine。
- 不把 LudoWeave 设为 hard dependency。
- 不让 Runtime UI 接管 Director/Timeline source-of-truth。

## 5. 核心概念

### 5.1 RuntimeUISystem

Sinan first-party engine system。

职责：

- 聚合 Director、Event、World、Input、Gameplay state。
- 生成 RuntimeUIViewModel。
- 接收 UIActionRef。
- 通过 registry/command path 执行动作。

RuntimeUISystem 不直接：

- 修改 editor store。
- 写项目 JSON。
- 依赖 Three object。
- 持有 React component state。

### 5.2 RuntimeUIViewModel

Runtime UI 的可序列化显示模型。

示例草案：

```json
{
  "frame": 1024,
  "surfaces": [
    {
      "id": "hud.main",
      "type": "hud",
      "visible": true,
      "items": [
        {
          "type": "prompt",
          "id": "prompt.interact.switch_a",
          "text": "Press E",
          "action": "runtime.gameplay.interact"
        }
      ]
    }
  ]
}
```

规则：

- ViewModel 可以由 runtime 生成，不一定保存到 data。
- 如果未来出现 authoring UI layout，必须另有 schema。
- ViewModel 不包含任意闭包。
- ViewModel 不包含 Three object、DOM node 或 React component。

### 5.3 UIActionRef

Runtime UI 发回 Sinan 的动作引用。

示例：

```txt
ui.confirm
ui.cancel
runtime.gameplay.interact
runtime.pause.resume
dialogue.next
```

规则：

- UIActionRef 不是任意 JS callback。
- UIActionRef 必须进入 Sinan registry 或 command routing。
- UI runtime 只能发出 action ref，不能直接改 World/Event/Director。

### 5.4 RuntimeUIRendererAdapter

具体 UI runtime 的渲染适配层。

可选实现：

- React overlay fallback。
- LudoWeave DOM renderer。
- LudoWeave Canvas renderer。
- Headless test renderer。

规则：

- Adapter 消费 RuntimeUIViewModel。
- Adapter 发出 UIActionRef。
- Adapter 不保存 source-of-truth。

## 6. Director / Timeline 关系

Subtitle、dialogue、prompt cue 的事实源仍属于 Sinan 数据和 Director/Timeline/Event。

推荐路径：

```txt
Timeline / Event / Gameplay
  -> DirectorSystem / EventSystem
  -> RuntimeUISystem command or state update
  -> RuntimeUIViewModel
  -> UI renderer adapter
  -> UIActionRef
  -> Sinan registry / command routing
```

不允许：

- LudoWeave 直接读取 `data/timelines/*.json` 并成为事实源。
- UI runtime 自己调度剧情状态。
- Subtitle 只存在 UI 内部 transient state。

## 7. LudoWeave POC Plan

### POC-1：Sinan RuntimeUIViewModel

Sinan 自研：

- `RuntimeUISystem` facade。
- `RuntimeUIViewModel` type。
- `UIActionRef` type。
- Headless renderer fixture。

验收：

- Prompt、Subtitle、Objective、Pause 至少能用 headless snapshot 表达。
- ViewModel 可测试、可 snapshot。
- 不依赖 React editor store。

### POC-2：LudoWeave Prompt + Subtitle

LudoWeave 消费 RuntimeUIViewModel，渲染：

- interact prompt。
- subtitle line。

验收：

- 同一组件在 standalone playground 和 Sinan Gate Demo 中运行。
- UI 点击或确认只发 UIActionRef。
- Sinan fallback renderer 可替代 LudoWeave。

### POC-3：Objective + Pause Menu

增加：

- objective / delivery hint。
- pause menu。
- keyboard/gamepad focus draft。

验收：

- runtimeGameplay context 下 pause 可打开。
- modal/pause context 下 gameplay input 被屏蔽。
- Playwright smoke 可看到 prompt/subtitle/pause 至少一种状态。

## 8. 验收标准

Runtime UI backend 进入 Sinan 主线前必须满足：

- 不替换 React Editor。
- 不接管 editor command/undo/save。
- 不接管 Timeline/Director source-of-truth。
- ViewModel 可 snapshot。
- UIActionRef 可测试。
- 有 headless renderer 或 deterministic fixture。
- 有 Gate Demo smoke。
- Sinan fallback renderer 可运行。

## 9. 拒绝方案

拒绝：

- 把 Runtime UI 继续散落在 editor panels 中。
- 让 LudoWeave 直接改 Sinan editor store。
- 在 UI node 中保存 arbitrary callback。
- 让 UI runtime 自行决定 gameplay event。
- POC 未通过就重写 Inspector/Timeline/AssetPanel。

## 10. Open Questions

- RuntimeUIViewModel 是否每帧完整生成，还是增量 patch？
- Subtitle 是否归 RuntimeUISystem，还是单独 `SubtitleSystem` 再汇入 UI？
- Runtime UI layout 是否需要进入 `data/ui/*.json`？
- LudoWeave adapter 是 Sinan repo 内部模块，还是外部 `@ludoweave/sinan` package？
