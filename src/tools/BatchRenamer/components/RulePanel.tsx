import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RenameRule } from '../utils/renamingUtils';
import { Input } from './ui/Input';
import { Trash2, Type, Hash, Replace, ArrowRightToLine, ArrowLeftToLine, FileEdit, Sparkles, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { MOTION } from '../../../lib/motion';

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

type CaseRuleValue = Extract<RenameRule, { type: 'case' }>['value'];

const CASE_OPTIONS: Array<{ value: CaseRuleValue; label: string }> = [
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

  const applyPreset = (index: number, preset: (typeof REGEX_PRESETS)[number]) => {
    const targetRule = rules[index];
    if (!targetRule || targetRule.type !== 'replace') return;

    updateRule(index, {
      ...targetRule,
      find: preset.find,
      replace: preset.replace,
      useRegex: true
    });
    setShowPresets(null);
  };

  return (
    <div className="space-y-6">
      {/* Rule Buttons - Static Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <RuleButton icon={FileEdit} label="统一命名" onClick={() => addRule('rename')} />
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
              initial={{ opacity: 0, y: 10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={MOTION.card}
              className={clsx(
                "border rounded-xl p-4 shadow-sm relative",
                "bg-white border-neutral-200"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-neutral-100 text-neutral-500">
                    {RULE_LABELS[rule.type]}
                  </span>
                  <button onClick={() => removeRule(index)} className="pressable rounded-md p-1 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500">
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
                      <p className="text-xs text-neutral-500 mt-2">
                        提示：配合"序号编号"使用可生成如 photo01, photo02 的序列
                      </p>
                    </div>
                  )}

                  {rule.type === 'replace' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                            className="rounded border-neutral-300 text-black focus:ring-black"
                            checked={rule.useRegex}
                            onChange={e => updateRule(index, { ...rule, useRegex: e.target.checked })}
                          />
                          <span className="font-medium">正则模式 (Regex)</span>
                        </label>
                        
                        {rule.useRegex && (
                          <div className="relative">
                            <button 
                              onClick={() => setShowPresets(showPresets === index ? null : index)}
                              className="pressable flex items-center gap-1 rounded bg-black px-2 py-1 text-[10px] text-white transition-colors hover:bg-neutral-800"
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
                    <div className="flex flex-wrap gap-2">
                      {CASE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateRule(index, { ...rule, value: opt.value })}
                          className={clsx(
                            "pressable rounded-md border px-3 py-1.5 text-xs font-medium transition-[background-color,border-color,color,box-shadow]",
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
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input 
                        type="number" 
                        label="起始值" 
                        className="w-full sm:w-20"
                        value={rule.start} 
                        onChange={e => updateRule(index, { ...rule, start: parseInt(e.target.value) || 0 })} 
                      />
                      <Input 
                        type="number" 
                        label="递增步长" 
                        className="w-full sm:w-20"
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

interface RuleButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}

const RuleButton = ({ icon: Icon, label, onClick, highlight }: RuleButtonProps) => (
  <button
    onClick={onClick}
    className={clsx(
      "pressable flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-[transform,background-color,border-color,box-shadow]",
      highlight 
        ? "bg-black border-black text-white shadow-sm"
        : "bg-white border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
    )}
  >
    <Icon size={20} className={highlight ? "text-white" : "text-neutral-600"} />
    <span className={clsx("text-xs font-medium", highlight ? "text-white" : "text-neutral-600")}>{label}</span>
  </button>
);
