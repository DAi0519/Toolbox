import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// Define the structure of a tool in our system
export interface ToolConfig {
  id: string;          // Used for URL route (e.g. 'color-picker')
  name: string;        // Displayed on the GearWheel
  description?: string; // Optional description
  component: LazyExoticComponent<ComponentType<object>>; // React Lazy loaded component
  fullscreen?: boolean; // If true, skip ToolLayout wrapper
}

// ─── TOOL REGISTRY (Single Source of Truth) ───
// To add a new tool, define its component in the 'tools/' folder and add an entry here.
export const TOOLS: ToolConfig[] = [
  {
    id: 'color-picker',
    name: '色彩拾取',
    component: lazy(() => import('../tools/ColorPicker/ColorPicker')),
    fullscreen: true,
  },
  {
    id: 'gradient-studio',
    name: '渐变工坊',
    description: '噪声渐变图生成器',
    component: lazy(() => import('../tools/GradientStudio/GradientStudio')),
    fullscreen: true,
  },
  {
    id: 'batch-renamer',
    name: '批量重命名',
    description: '批量文件重命名工具',
    component: lazy(() => import('../tools/BatchRenamer/BatchRenamer'))
  },
  {
    id: 'image-studio',
    name: '图像创作实验室',
    description: 'AI 图像生成工具',
    component: lazy(() => import('../tools/ImageStudio/ImageStudio')),
    fullscreen: true,
  },
  {
    id: 'music-pad',
    name: 'Music Pad',
    description: '12x12 sequencer with image-to-pattern import and MP3 export',
    component: lazy(() => import('../tools/MusicPad/MusicPad')),
    fullscreen: true,
  }
];
