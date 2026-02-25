import { lazy } from 'react';

// Define the structure of a tool in our system
export interface ToolConfig {
  id: string;          // Used for URL route (e.g. 'color-picker')
  name: string;        // Displayed on the GearWheel
  description?: string; // Optional description
  component: React.LazyExoticComponent<any>; // React Lazy loaded component
}

// ─── TOOL REGISTRY (Single Source of Truth) ───
// To add a new tool, define its component in the 'tools/' folder and add an entry here.
export const TOOLS: ToolConfig[] = [
  {
    id: 'color-picker',
    name: 'Color Picker',
    component: lazy(() => import('../tools/ColorPicker/ColorPicker'))
  },
  {
    id: 'image-tools',
    name: 'Image Tools',
    component: lazy(() => import('../tools/ImageTools/ImageTools'))
  },
  {
    id: 'typography',
    name: 'Typography',
    component: lazy(() => import('../tools/Typography/Typography'))
  },
  {
    id: 'code-format',
    name: 'Code Format',
    component: lazy(() => import('../tools/CodeFormat/CodeFormat'))
  },
  {
    id: 'converter',
    name: 'Converter',
    component: lazy(() => import('../tools/Converter/Converter'))
  },
  {
    id: 'generator',
    name: 'Generator',
    component: lazy(() => import('../tools/Generator/Generator'))
  },
  {
    id: 'calculator',
    name: 'Calculator',
    component: lazy(() => import('../tools/Calculator/Calculator'))
  },
  {
    id: 'encoder',
    name: 'Encoder',
    component: lazy(() => import('../tools/Encoder/Encoder'))
  },
  {
    id: 'compressor',
    name: 'Compressor',
    component: lazy(() => import('../tools/Compressor/Compressor'))
  },
  {
    id: 'validator',
    name: 'Validator',
    component: lazy(() => import('../tools/Validator/Validator'))
  },
  {
    id: 'minifier',
    name: 'Minifier',
    component: lazy(() => import('../tools/Minifier/Minifier'))
  },
  {
    id: 'beautifier',
    name: 'Beautifier',
    component: lazy(() => import('../tools/Beautifier/Beautifier'))
  },
  {
    id: 'batch-renamer',
    name: 'Batch Renamer',
    description: '批量文件重命名工具',
    component: lazy(() => import('../tools/BatchRenamer/BatchRenamer'))
  }
];
