# ImageStudio/
> L3 | 父级: src/tools/CLAUDE.md

成员清单
ImageStudio.tsx: 主组件，全屏布局，API Key + History + toast 管理，移动端键盘 inset 适配
types.ts: `AspectRatio` / `ImageSize` 常量与 `GenerationSettings` / `GenerationSession` 接口
services/geminiService.ts: 纯函数 `generateImages(apiKey, settings)`，内部创建 `GoogleGenAI` 实例
components/ApiKeyModal.tsx: API Key 输入弹窗，required 模式（不可关闭）/ 可选模式
components/Button.tsx: 按钮组件，主色使用 `var(--accent)`
components/Controls.tsx: 左侧控制面板（提示词/尺寸/比例/数量）
components/ImageViewer.tsx: 图像预览、多图导航、下载、加载态
components/HistoryDrawer.tsx: 历史抽屉，点击回放，清空历史
utils/apiKey.ts: API Key 规范化与校验（去除 Bearer/引号/空白并校验 header-safe 字符）

状态持久化
- API Key: localStorage key = `playbox.imageStudio.apiKey`
- History: localStorage key = `playbox.imageStudio.history`
- 条目上限: `MAX_HISTORY = 10`
- 存储配额保护: `MAX_HISTORY_STORAGE_BYTES = 4_500_000`，`MAX_SESSION_STORAGE_BYTES = 1_500_000`

关键约束（新增 2026-03-05）
- 历史记录写入前必须做 `isGenerationSession` 校验与大小归一化，防止 localStorage 污染/超限。
- 历史保存失败且为 quota 超限时，需逐步丢弃最旧条目直到可写；仍失败则清空该 key。
- 生成按钮可用条件: `prompt` 非空且 `apiKey` 已配置。
- 移动端需基于 `visualViewport` 计算键盘 inset，避免底部控件被输入法遮挡。
- fullscreen 工具自管 header 与主滚动区，不依赖 ToolLayout 包裹。
- 生成请求前必须验证 API Key 为 header-safe 字符，避免 `Headers.append` 的 ISO-8859-1 异常。
- API 返回 `API_KEY_INVALID` 时需展示可读错误，并清除本地无效 key 后重新打开 API Key 弹窗。
- API Key 输入允许直接粘贴，保存前会自动移除 `Bearer `、引号和空白字符后再校验。
- `required` 模式的 API Key 弹窗也必须提供可见的退出路径（返回主页），不能把用户锁死在工具内。
- API Key 弹窗在移动端必须沿用桌面端同一张卡片的视觉语言；仅允许宽度自适应，不要单独降级成另一套更松散或更弱的移动端样式。
- 生成链路使用 `models.generateContent` + `gemini-3-pro-image-preview`，并强制 `responseModalities: [IMAGE]`。
- `imageConfig.imageSize` 直接透传 `1K/2K/4K`；`4K` 为原生请求，不走本地上采样。
- 多图生成采用串行请求（非 `Promise.all` 并发），单张失败会按可重试错误做指数退避重试，降低批量失败概率。

对外暴露
export { default } from './ImageStudio'
