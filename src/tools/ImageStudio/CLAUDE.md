# ImageStudio/
> L3 | 父级: src/tools/CLAUDE.md

成员清单
ImageStudio.tsx: 主组件，全屏布局，API Key + History 状态管理，useNavigate('/') 返回
types.ts: as const 对象(AspectRatio/ImageSize) + 接口(GenerationSettings/GenerationSession)
services/geminiService.ts: 纯函数 generateImages(apiKey, settings)，内部创建 GoogleGenAI 实例
components/ApiKeyModal.tsx: API Key 输入弹窗，required模式(不可关闭) / 可选模式，链接到 aistudio.google.com
components/Button.tsx: 按钮组件，primary 色改为 var(--accent)(Klein Blue)
components/Controls.tsx: 左侧控制面板，含历史记录按钮，textarea 加 userSelect:text
components/ImageViewer.tsx: 图像预览，多图导航，下载，loading spinner 用 var(--accent)
components/HistoryDrawer.tsx: 右侧历史抽屉，最新在前，支持点击回放，清空

对外暴露
export { default } from './ImageStudio'

状态持久化
- API Key: localStorage key = playbox.imageStudio.apiKey
- History: localStorage key = playbox.imageStudio.history，上限 MAX_HISTORY=10，写入时 try/catch 降级

特殊行为
- fullscreen: true → App.tsx 不包裹 ToolLayout，工具自己渲染返回按钮
- 首次加载无 Key → ApiKeyModal 以 required=true 打开（不可 Escape 关闭）
- API Key 状态按钮：绿点(已配置) / 红点(未配置)
