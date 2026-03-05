import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FileItem } from '../utils/renamingUtils';
import { FileText, X, ArrowDown } from 'lucide-react';
import { Button } from './ui/Button';
import { clsx } from 'clsx';

interface FileListProps {
  files: FileItem[];
  onRemove: (id: string) => void;
}

export const FileList: React.FC<FileListProps> = ({ files, onRemove }) => {
  if (files.length === 0) return null;

  return (
    <div className="w-full bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center shrink-0">
        <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          预览 ({files.length} 个文件)
        </h3>
      </div>
      
      <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent flex-1 min-h-[400px]">
        <AnimatePresence initial={false}>
          {files.map((file) => {
            const isChanged = file.originalName !== file.newName;
            
            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="group flex items-start gap-4 px-6 py-4 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors"
              >
                <div className="mt-1 p-2 rounded-lg bg-neutral-100 text-neutral-400 group-hover:text-neutral-600 transition-colors">
                  <FileText size={18} />
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
                    <div className="flex items-start gap-2 text-neutral-900 font-semibold text-base break-all leading-relaxed">
                      <ArrowDown size={16} className="mt-1 text-black shrink-0 rotate-[-90deg] sm:rotate-0" />
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
