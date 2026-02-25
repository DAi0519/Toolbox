import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RenameRule } from '../utils/renamingUtils';
import { Input } from './ui/Input';
import { Trash2, Type, Hash, Replace, ArrowRightToLine, ArrowLeftToLine, FileEdit, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface RulePanelProps {
  rules: RenameRule[];
  setRules: React.Dispatch<React.SetStateAction<RenameRule[]>>;
}

const RULE_LABELS: Record<RenameRule['type'], string> = {
  rename: '统一命名',
  replace: '查找替换',
  prefix: '添加前缀',
  suffix: '添加后缀',
  case: '大小写转换',
  numbering: '序号编号',
};

const CASE_OPTIONS = [
  { value: 'upper', label: '全大写' },
  { value: 'lower', label: '全小写' },
  { value: 'title', label: '首字母大写' },
];

const REGEX_PRESETS = [
  {
    label: '标准格式化: Name (1) → Name_1',
    find: '^(.+)\\s+\\((\\d+)\\).*$',
    replace: '$1_$2'
  },
  {
    label: '交换位置: A_B → B_A',
    find: '^([^_]+)_([^_]+)$',
    replace: '$2_$1'
  },
  {
    label: '复杂重组: Code G_B-A (N) → Code_G_A_B_N',
    find: '^([A-Z0-9-]+)\\s+([\\u4e00-\\u9fa5]+)_([\\u4e00-\\u9fa5]+)-([\\u4e00-\\u9fa5]+)\\s+\\((\\d+)\\).*$',
    replace: '$1_$2_$4_$3_$5'
  }
];

export const RulePanel: React.FC<RulePanelProps> = ({ rules, setRules }) => {
  const [showPresets, setShowPresets] = useState<number | null>(null);

  const addRule = (type: RenameRule['type']) => {
    let newRule: RenameRule;
    switch (type) {
      case 'rename': newRule = { type: 'rename', value: '' }; break;
      case 'replace': newRule = { type: 'replace', find: '', replace: '', useRegex: false, caseSensitive: false }; break;
      case 'prefix': newRule = { type: 'prefix', value: '' }; break;
      case 'suffix': newRule = { type: 'suffix', value: '' }; break;
      case 'case': newRule = { type: 'case', value: 'title' }; break;
      case 'numbering': newRule = { type: 'numbering', start: 1, step: 1, format: '00' }; break;
      default: return;
    }
    setRules([...rules, newRule]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updated: RenameRule) => {
    const newRules = [...rules];
    newRules[index] = updated;
    setRules(newRules);
  };

  const applyPreset = (index: number, preset: typeof REGEX_PRESETS[0]) => {
    updateRule(index, {
      ...rules[index],
      // @ts-ignore
      find: preset.find,
      replace: preset.replace,
      useRegex: true
    });
    setShowPresets(null);
  };

  return (
    <div className="space-y-6">
      {/* Rule Buttons - Static Grid */}
      <div className="grid grid-cols-3 gap-2">
        <RuleButton icon={FileEdit} label="统一命名" onClick={() => addRule('rename')} highlight />
        <RuleButton icon={Replace} label="查找替换" onClick={() => addRule('replace')} />
        <RuleButton icon={ArrowRightToLine} label="添加前缀" onClick={() => addRule('prefix')} />
        <RuleButton icon={ArrowLeftToLine} label="添加后缀" onClick={() => addRule('suffix')} />
        <RuleButton icon={Type} label="大小写" onClick={() => addRule('case')} />
        <RuleButton icon={Hash} label="序号编号" onClick={() => addRule('numbering')} />
      </div>

      {/* Applied Rules - Simple List (No Drag) */}
      <div className="space-y-3">
        {rules.length === 0 && (
          <div className="text-center py-8 text-neutral-400 border-2 border-dashed border-neutral-100 rounded-xl">
            暂无规则，点击上方按钮添加
          </div>
        )}
        
        <AnimatePresence initial={false}>
          {rules.map((rule, index) => (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={clsx(
                "border rounded-xl p-4 shadow-sm relative",
                rule.type === 'rename' 
                  ? "bg-orange-50 border-orange-200" 
                  : "bg-white border-neutral-200"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={clsx(
                    "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded",
                    rule.type === 'rename'
                      ? "bg-orange-100 text-orange-600"
                      : "bg-neutral-100 text-neutral-500"
                  )}>
                    {RULE_LABELS[rule.type]}
                  </span>
                  <button onClick={() => removeRule(index)} className="text-neutral-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Rule Inputs */}
                <div className="grid gap-3">
                  {rule.type === 'rename' && (
                    <div>
                      <Input 
                        placeholder="输入新文件名（清空原名后统一使用此名称）" 
                        value={rule.value} 
                        onChange={e => updateRule(index, { ...rule, value: e.target.value })} 
                      />
                      <p className="text-xs text-orange-500 mt-2">
                        提示：配合"序号编号"使用可生成如 photo01, photo02 的序列
                      </p>
                    </div>
                  )}

                  {rule.type === 'replace' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          placeholder="查找内容" 
                          value={rule.find} 
                          onChange={e => updateRule(index, { ...rule, find: e.target.value })} 
                        />
                        <Input 
                          placeholder="替换为" 
                          value={rule.replace} 
                          onChange={e => updateRule(index, { ...rule, replace: e.target.value })} 
                        />
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                            checked={rule.useRegex}
                            onChange={e => updateRule(index, { ...rule, useRegex: e.target.checked })}
                          />
                          <span className="font-medium">正则模式 (Regex)</span>
                        </label>
                        
                        {rule.useRegex && (
                          <div className="relative">
                            <button 
                              onClick={() => setShowPresets(showPresets === index ? null : index)}
                              className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100 transition-colors"
                            >
                              <Sparkles size={10} />
                              常用模板
                            </button>
                            
                            {showPresets === index && (
                              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-neutral-100 z-10 overflow-hidden">
                                {REGEX_PRESETS.map((preset, i) => (
                                  <button
                                    key={i}
                                    onClick={() => applyPreset(index, preset)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 text-neutral-600 border-b border-neutral-50 last:border-0"
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(rule.type === 'prefix' || rule.type === 'suffix') && (
                    <Input 
                      placeholder={rule.type === 'prefix' ? '输入前缀文本' : '输入后缀文本'}
                      value={rule.value} 
                      onChange={e => updateRule(index, { ...rule, value: e.target.value })} 
                    />
                  )}

                  {rule.type === 'case' && (
                    <div className="flex gap-2">
                      {CASE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateRule(index, { ...rule, value: opt.value as any })}
                          className={clsx(
                            "px-3 py-1.5 text-xs font-medium rounded-md border transition-all",
                            rule.value === opt.value 
                              ? "bg-neutral-900 text-white border-neutral-900" 
                              : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {rule.type === 'numbering' && (
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        label="起始值" 
                        className="w-20"
                        value={rule.start} 
                        onChange={e => updateRule(index, { ...rule, start: parseInt(e.target.value) || 0 })} 
                      />
                      <Input 
                        type="number" 
                        label="递增步长" 
                        className="w-20"
                        value={rule.step} 
                        onChange={e => updateRule(index, { ...rule, step: parseInt(e.target.value) || 1 })} 
                      />
                      <Input 
                        label="格式 (如 000)" 
                        className="flex-1"
                        value={rule.format} 
                        onChange={e => updateRule(index, { ...rule, format: e.target.value })} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const RuleButton = ({ icon: Icon, label, onClick, highlight }: { icon: any, label: string, onClick: () => void, highlight?: boolean }) => (
  <button
    onClick={onClick}
    className={clsx(
      "flex flex-col items-center justify-center p-3 gap-2 border rounded-xl hover:bg-neutral-50 active:scale-95 transition-all",
      highlight 
        ? "bg-orange-50 border-orange-200 hover:border-orange-400 hover:bg-orange-100"
        : "bg-white border-neutral-200 hover:border-neutral-400"
    )}
  >
    <Icon size={20} className={highlight ? "text-orange-600" : "text-neutral-600"} />
    <span className={clsx("text-xs font-medium", highlight ? "text-orange-600" : "text-neutral-600")}>{label}</span>
  </button>
);
