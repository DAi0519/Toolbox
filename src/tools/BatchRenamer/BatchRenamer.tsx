import React, { useState, useEffect } from 'react';
import { DropZone } from './components/DropZone';
import { FileList } from './components/FileList';
import { RulePanel } from './components/RulePanel';
import type { RenameRule, FileItem } from './utils/renamingUtils';
import { applyRules, resolveConflicts, renumberSequentially } from './utils/renamingUtils';
import { Button } from './components/ui/Button';
import { Download, RefreshCw, Trash2, ShieldCheck, ListOrdered } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';

function AppContent() {
  const [sourceFiles, setSourceFiles] = useState<{id: string, file: File}[]>([]);
  const [rules, setRules] = useState<RenameRule[]>([]);
  const [autoResolve, setAutoResolve] = useState(true);
  const [strictSequence, setStrictSequence] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesDropped = (droppedFiles: File[]) => {
    const newFiles = droppedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file
    }));
    setSourceFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setSourceFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleClearAll = () => {
    setSourceFiles([]);
    // Keep rules for reuse
  };

  // Derive processed files
  const processedFiles = React.useMemo(() => {
    // 1. Apply rules
    let processed = sourceFiles.map((item, index) => ({
      id: item.id,
      originalFile: item.file,
      originalName: item.file.name,
      newName: applyRules(item.file.name, rules, index)
    }));

    // 2. Strict Sequential Renumbering (Optional)
    if (strictSequence) {
      processed = renumberSequentially(processed);
    }

    // 3. Resolve conflicts (Always run if enabled, to catch edge cases)
    return autoResolve ? resolveConflicts(processed) : processed;
  }, [sourceFiles, rules, autoResolve, strictSequence]);

  const handleDownload = async () => {
    if (processedFiles.length === 0) return;
    setIsProcessing(true);

    try {
      const zip = new JSZip();
      processedFiles.forEach(file => {
        zip.file(file.newName, file.originalFile);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'renamed_files.zip');
    } catch (error) {
      console.error('Failed to zip files', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const hasFiles = sourceFiles.length > 0;

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-neutral-900 font-sans selection:bg-orange-200 selection:text-orange-900">
      <div className="max-w-7xl mx-auto p-6 lg:p-12 space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-end pb-6 border-b border-neutral-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">文件重命名</h1>
            <p className="text-neutral-500 mt-1 font-medium">批量处理工具</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleClearAll} disabled={!hasFiles}>
              <Trash2 size={18} className="mr-2" />
              清空
            </Button>
            <Button 
              onClick={handleDownload} 
              disabled={!hasFiles || isProcessing}
              className="bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200"
            >
              {isProcessing ? (
                <RefreshCw size={18} className="mr-2 animate-spin" />
              ) : (
                <Download size={18} className="mr-2" />
              )}
              {isProcessing ? '处理中...' : '导出文件'}
            </Button>
          </div>
        </header>

        <main>
          <AnimatePresence mode="wait">
            {!hasFiles ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <DropZone onFilesDropped={handleFilesDropped} />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="grid lg:grid-cols-[1fr,1.5fr] gap-8 items-start"
              >
                {/* Left Column: Rules (Input/Process) */}
                <div className="space-y-6 sticky top-8">
                  <DropZone onFilesDropped={handleFilesDropped} />
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-neutral-50/50 rounded-2xl p-1"
                  >
                    <div className="mb-4 px-2 flex flex-col gap-2">
                      <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
                        转换规则
                      </h2>
                      
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer hover:text-neutral-800 transition-colors">
                          <input 
                            type="checkbox"
                            checked={autoResolve}
                            onChange={e => setAutoResolve(e.target.checked)}
                            className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="flex items-center gap-1">
                            <ShieldCheck size={12} />
                            自动解决重名
                          </span>
                        </label>

                        <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer hover:text-neutral-800 transition-colors">
                          <input 
                            type="checkbox"
                            checked={strictSequence}
                            onChange={e => setStrictSequence(e.target.checked)}
                            className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="flex items-center gap-1">
                            <ListOrdered size={12} />
                            强制连续编号 (1, 2, 3...)
                          </span>
                        </label>
                      </div>
                    </div>
                    <RulePanel rules={rules} setRules={setRules} />
                  </motion.div>
                </div>

                {/* Right Column: Files (Output/Preview) */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="min-h-[600px]"
                >
                  <FileList files={processedFiles} onRemove={handleRemoveFile} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}

export default AppContent;
