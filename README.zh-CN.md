# Sinan

[English](README.md)

AI 原生、数据优先的 Web 3D 游戏引擎与编辑器，场景和规则以 JSON/Schema/测试表达。

![Sinan 封面](docs/cover.png)

## 项目包含什么

- 数据优先的场景和规则。
- Web 3D 编辑器与运行时。
- 基于 Schema 的自动化测试。

## 快速开始

安装依赖并启动本地版本：

```bash
npm install
npm run dev
```

仓库还提供 `npm run build`、`npm run test`、`npm run lint`。

## 仓库结构

- `src/` — 应用与库的源代码。
- `scripts/` — 运行时或自动化脚本。
- `data/` — 结构化项目数据。
- `docs/` — 项目文档与设计说明。
- `tests/` — 自动化测试与校验材料。

## 文档

- [`docs/developer-guide.md`](docs/developer-guide.md)
- [`docs/editor-ui-design-parity-requirements.md`](docs/editor-ui-design-parity-requirements.md)
- [`docs/editor-ui-ux-redesign-brief.md`](docs/editor-ui-ux-redesign-brief.md)
- [`docs/editor-ui-ux-variant-style-guide.md`](docs/editor-ui-ux-variant-style-guide.md)
- [`docs/engine-positioning-architecture-adjustment-plan.md`](docs/engine-positioning-architecture-adjustment-plan.md)

## 当前状态

Sinan 已有较完整的编辑器、运行时和测试，但部分适配器仍是可替换原型；其中本地 WebSocket 适配器不属于生产级网络方案。

## 许可证

当前仓库未包含开源许可证。
