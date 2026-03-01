/**
 * [INPUT]: 无外部依赖，纯配置定义
 * [OUTPUT]: 导出 ToolConfig 接口, TOOLS 数组
 * [POS]: 工具注册表，应用路由的唯一真相来源
 * [PROTOCOL]: 新增工具必须在此添加条目
 */

# ToolConfig 接口
id: string          // URL 路由标识
name: string        // 齿轮轮盘显示名称
description?: string
component: React.LazyExoticComponent<any>  // 懒加载组件

# 当前注册工具 (13个)
color-picker, image-tools, typography, code-format, converter,
generator, calculator, encoder, compressor, validator,
minifier, beautifier, batch-renamer