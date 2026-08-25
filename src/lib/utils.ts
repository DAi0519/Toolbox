/**
 * [INPUT]: 依赖 clsx 的条件类名归一化与 tailwind-merge 的 Tailwind 冲突消解
 * [OUTPUT]: 对外提供 cn 类名合并函数
 * [POS]: lib 的通用样式工具，供 shadcn 注册表组件与业务组件复用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
