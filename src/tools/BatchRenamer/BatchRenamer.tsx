import React, { useCallback, useMemo, useState } from 'react';
import { DropZone } from './components/DropZone';
import { FileList } from './components/FileList';
import { RulePanel } from './components/RulePanel';
import type { RenameRule } from './utils/renamingUtils';
import { applyRules, resolveConflicts, renumberSequentially } from './utils/renamingUtils';
import { Button } from './components/ui/Button';
import { Download, RefreshCw, Trash2, ShieldCheck, ListOrdered } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import { useToolHeaderActions } from '../../components/ToolHeaderActionsContext';

const saveZipBlob = async (blob: Blob, filename: string): Promise<void> => {
  if (!('showSaveFilePicker' in window)) {
    saveAs(blob, filename);
    return;
  }

  try {
    const showSaveFilePicker = (
      window as Window & {
        showSaveFilePicker?: (options?: {
          suggestedName?: string;
          types?: Array<{
            description?: string;
            accept: Record<string, string[]>;
          }>;
        }) => Promise<{
          createWritable: () => Promise<{
            write: (data: Blob) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      }
    ).showSaveFilePicker;

    if (!showSaveFilePicker) {
      saveAs(blob, filename);
      return;
    }

    const handle = await showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: 'ZIP Archive',
          accept: {
            'application/zip': ['.zip']
          }
        }
      ]
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    // User manually canceled save dialog.
    if (error instanceof DOMException && error.name === 'AbortError') return;
    // Fallback for browsers/environments with partial picker support.
    saveAs(blob, filename);
  }
};

function AppContent() {
  const [sourceFiles, setSourceFiles] = useState<{id: string, file: File}[]>([]);
  const [rules, setRules] = useState<RenameRule[]>([]);
  const [autoResolve, setAutoResolve] = useState(true);
  const [strictSequence, setStrictSequence] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 2200);
  }, []);

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
    showToast('已清空文件列表');
  };

  // Derive processed files
  const processedFiles = React.useMemo(() => {
    // 1. Apply rules
    let processed = sourceFiles.map((item, index) => {
      const relativePath = item.file.webkitRelativePath || item.file.name;
      const parts = relativePath.split('/');
      const originalName = parts[parts.length - 1] || item.file.name;
      const originalDir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';

      return {
        id: item.id,
        originalFile: item.file,
        originalName,
        originalDir,
        newName: applyRules(originalName, rules, index)
      };
    });

    // 2. Strict Sequential Renumbering (Optional)
    if (strictSequence) {
      processed = renumberSequentially(processed);
    }

    // 3. Resolve conflicts (Always run if enabled, to catch edge cases)
    return autoResolve ? resolveConflicts(processed) : processed;
  }, [sourceFiles, rules, autoResolve, strictSequence]);

  const handleDownload = useCallback(async () => {
    if (processedFiles.length === 0) return;
    setIsProcessing(true);

    try {
      const zip = new JSZip();

      // Read each file as ArrayBuffer to ensure JSZip uses our newName
      await Promise.all(
        processedFiles.map(async (file) => {
          const buffer = await file.originalFile.arrayBuffer();
          const zipPath = file.originalDir ? `${file.originalDir}/${file.newName}` : file.newName;
          zip.file(zipPath, buffer);
        })
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      await saveZipBlob(blob, 'renamed_files.zip');
      showToast('导出完成：renamed_files.zip');
    } catch (error) {
      console.error('Failed to zip files', error);
      showToast('导出失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }, [processedFiles, showToast]);

  const hasFiles = sourceFiles.length > 0;
  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={handleClearAll} disabled={!hasFiles} title="清空文件">
          <Trash2 size={16} className="sm:mr-1.5" />
          <span>清空</span>
        </Button>
        <Button
          size="sm"
          onClick={handleDownload}
          disabled={!hasFiles || isProcessing}
          className="bg-black hover:bg-neutral-800 text-white shadow-sm transition-all"
          title={isProcessing ? '处理中' : '导出文件'}
        >
          {isProcessing ? (
            <RefreshCw size={16} className="animate-spin sm:mr-1.5" />
          ) : (
            <Download size={16} className="sm:mr-1.5" />
          )}
          <span>{isProcessing ? '处理中...' : '导出'}</span>
        </Button>
      </div>
    ),
    [hasFiles, isProcessing, handleDownload]
  );
  useToolHeaderActions(headerActions);

  return (
    <div className="min-h-full bg-[var(--bg)] text-[var(--ink)] selection:bg-black selection:text-white">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-12 lg:space-y-8">
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
                className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr,1.5fr] lg:gap-8"
              >
                {/* Left Column: Rules (Input/Process) */}
                <div className="space-y-6 lg:sticky lg:top-8">
                  <DropZone onFilesDropped={handleFilesDropped} />
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl bg-neutral-50/50 p-1"
                  >
                    <div className="mb-4 flex flex-col gap-2 px-2">
                      <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
                        转换规则
                      </h2>
                      
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer hover:text-neutral-800 transition-colors">
                          <input 
                            type="checkbox"
                            checked={autoResolve}
                            onChange={e => setAutoResolve(e.target.checked)}
                            className="rounded border-neutral-300 text-black focus:ring-black"
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
                            className="rounded border-neutral-300 text-black focus:ring-black"
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
                  className="min-h-[420px] lg:min-h-[600px]"
                >
                  <FileList files={processedFiles} onRemove={handleRemoveFile} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+var(--safe-bottom))] z-50 flex justify-center px-4">
          <div className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

export default AppContent;
