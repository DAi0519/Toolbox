import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FileItem } from '../utils/renamingUtils';
import { FileText, X, ArrowDown } from 'lucide-react';
import { Button } from './ui/Button';
import { clsx } from 'clsx';
import { EASING } from '../../../lib/motion';

interface FileListProps {
  files: FileItem[];
  onRemove: (id: string) => void;
}

export const FileList: React.FC<FileListProps> = ({ files, onRemove }) => {
  if (files.length === 0) return null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm sm:rounded-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-4 py-3 sm:px-6 sm:py-4">
        <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          预览 ({files.length} 个文件)
        </h3>
      </div>
      
      <div className="scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent min-h-[280px] flex-1 overflow-y-auto sm:min-h-[400px]">
        <AnimatePresence initial={false}>
          {files.map((file) => {
            const isChanged = file.originalName !== file.newName;
            
            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, height: 0, y: 12 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{
                  height: { duration: 0.22, ease: EASING.out },
                  opacity: { duration: 0.16, ease: EASING.out },
                  y: { duration: 0.22, ease: EASING.out },
                }}
                className="group flex items-start gap-3 border-b border-neutral-100 px-4 py-3 transition-colors last:border-0 hover:bg-neutral-50 sm:gap-4 sm:px-6 sm:py-4"
              >
                <div className="mt-1 rounded-lg bg-neutral-100 p-2 text-neutral-400 transition-colors group-hover:text-neutral-600">
                  <FileText size={16} />
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  {/* Original Name */}
                  <div className={clsx(
                    "text-sm break-all leading-relaxed transition-colors",
                    isChanged ? "text-neutral-400 line-through decoration-neutral-300" : "text-neutral-900 font-medium"
                  )}>
                    {file.originalName}
                  </div>
                  
                  {/* New Name (Only if changed) */}
                  {isChanged && (
                    <div className="flex items-start gap-2 break-all text-sm font-semibold leading-relaxed text-neutral-900 sm:text-base">
                      <ArrowDown size={16} className="mt-1 shrink-0 rotate-[-90deg] text-black sm:rotate-0" />
                      <span className="bg-neutral-100 text-black px-1 -ml-1 rounded">
                        {file.newName}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(file.id)}
                  className="opacity-80 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity text-neutral-400 hover:text-red-500 shrink-0"
                >
                  <X size={18} />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
