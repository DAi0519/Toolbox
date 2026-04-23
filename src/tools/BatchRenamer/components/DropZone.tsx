import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FilePlus, Folder, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { MOTION } from '../../../lib/motion';

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void;
}

// Recursively read all files from directory entries
const readAllEntries = async (entry: FileSystemEntry): Promise<File[]> => {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((file) => {
        // Preserve the relative path
        const relativePath = entry.fullPath.slice(1); // Remove leading /
        Object.defineProperty(file, 'webkitRelativePath', {
          value: relativePath,
          writable: false,
        });
        resolve([file]);
      }, () => resolve([]));
    });
  } else if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    return new Promise((resolve) => {
      const allFiles: File[] = [];
      const readEntries = () => {
        dirReader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(allFiles);
          } else {
            for (const e of entries) {
              const files = await readAllEntries(e);
              allFiles.push(...files);
            }
            readEntries(); // Continue reading (some browsers batch entries)
          }
        }, () => resolve(allFiles));
      };
      readEntries();
    });
  }
  return [];
};

export const DropZone: React.FC<DropZoneProps> = ({ onFilesDropped }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const folderInput = folderInputRef.current;
    if (!folderInput) return;

    folderInput.setAttribute('webkitdirectory', '');
    folderInput.setAttribute('directory', '');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items) {
      const allFiles: File[] = [];
      const entries: FileSystemEntry[] = [];
      
      // Collect all entries first
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
          entries.push(entry);
        }
      }

      // Process all entries
      for (const entry of entries) {
        const files = await readAllEntries(entry);
        allFiles.push(...files);
      }

      if (allFiles.length > 0) {
        onFilesDropped(allFiles);
      }
    } else {
      // Fallback for browsers that don't support webkitGetAsEntry
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesDropped(files);
      }
    }
  }, [onFilesDropped]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesDropped(Array.from(e.target.files));
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  }, [onFilesDropped]);

  const handleSelectFiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleSelectFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    folderInputRef.current?.click();
  };

  return (
    <motion.div
      layout
      animate={isDragging ? { scale: 1.01, y: -2 } : { scale: 1, y: 0 }}
      transition={MOTION.settle}
      className={clsx(
        "relative group overflow-hidden rounded-2xl border-2 border-dashed transition-[border-color,background-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out)]",
        isDragging 
          ? "border-black bg-neutral-50 shadow-[0_18px_50px_rgba(0,0,0,0.08)]"
          : "border-neutral-200 bg-transparent hover:border-neutral-300"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
      
      <div className="flex flex-col items-center justify-center space-y-4 px-4 py-10 text-center sm:space-y-5 sm:py-12">
        <motion.div
          animate={{
            scale: isDragging ? 1.08 : 1,
            rotate: isDragging ? 4 : 0,
          }}
          transition={MOTION.settle}
          className={clsx(
            "rounded-full p-4 transition-colors duration-200 [transition-timing-function:var(--ease-out)]",
            isDragging ? "bg-black text-white" : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200 group-hover:text-black"
          )}
        >
          {isDragging ? <FilePlus size={32} /> : <Upload size={32} />}
        </motion.div>
        
        <div className="space-y-1">
          <p className="text-base font-medium text-neutral-900 sm:text-lg">
            {isDragging ? "释放以添加" : "拖拽文件或文件夹至此处"}
          </p>
          <p className="text-sm text-neutral-500">
            支持所有文件类型，可批量处理
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full flex-col gap-2 pt-2 sm:w-auto sm:flex-row sm:gap-3">
          <button
            onClick={handleSelectFiles}
            className="pressable inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-[background-color,box-shadow] hover:bg-neutral-800"
          >
            <FileText size={16} />
            选择文件
          </button>
          <button
            onClick={handleSelectFolder}
            className="pressable inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-[var(--ink)] shadow-sm transition-[background-color,border-color,box-shadow] hover:border-neutral-300 hover:bg-neutral-50"
          >
            <Folder size={16} />
            选择文件夹
          </button>
        </div>
      </div>
    </motion.div>
  );
};
