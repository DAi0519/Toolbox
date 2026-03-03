import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ColorWheel from './ColorWheel';
import { extractColors } from './utils/color';

export default function ColorPicker() {
  const navigate = useNavigate();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle color copying
  const handleColorSelect = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Process the uploaded or dropped file
  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    setIsExtracting(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);
      try {
        // Extract 24 colors for a nice dense wheel, like Iris
        const extractedColors = await extractColors(src, 24);
        setColors(extractedColors);
      } catch (error) {
        console.error('Failed to extract colors:', error);
        alert('Failed to extract colors from image.');
      } finally {
        setIsExtracting(false);
      }
    };
    
    reader.readAsDataURL(file);
  }, []);

  // Drag & Drop handlers
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile]);

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-serif"
      style={{ backgroundColor: '#F4F4E8' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          // Reset input so the same file can be uploaded again
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
      />

      {/* Top Left Navigation / Gallery Button */}
      <div className="fixed top-6 left-6 z-40 flex flex-col gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#CCCCCC] bg-[#F4F4E8]/90 backdrop-blur-md text-[11px] tracking-[0.15em] text-[#888888] transition-all hover:border-[#777] hover:text-[#333] hover:bg-black/5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] uppercase"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          <span>Back</span>
        </button>
      </div>

      {/* Header Area */}
      <div className="absolute top-12 left-0 right-0 flex flex-col items-center z-20 pointer-events-none">
        <h1 className="text-2xl text-[#736A6A] tracking-[0.08em] mb-2">Iris</h1>
        <p className="text-xs text-[#888888] tracking-[0.12em]">
          {imageSrc 
            ? "Click segments or the image to pick colors" 
            : "Upload or paste an image to extract its palette"}
        </p>
      </div>

      {/* Main Interactive Area */}
      <div className="z-10 flex-1 flex items-center justify-center mt-16 mb-24">
        <ColorWheel
          colors={colors}
          imageSrc={imageSrc}
          isExtracting={isExtracting}
          onUploadClick={() => fileInputRef.current?.click()}
          onColorSelect={handleColorSelect}
          onReset={() => {
            setImageSrc(null);
            setColors([]);
          }}
        />
      </div>

      {/* Footer Area */}
      <div className="absolute bottom-8 text-center w-full z-20 pointer-events-none">
        <p className="text-[9.5px] text-[#999999] tracking-[0.08em]">
          made by <a href="#" className="underline underline-offset-2 decoration-[#CCC] pointer-events-auto hover:decoration-[#999] transition-colors">Playbox</a>
        </p>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {copiedColor && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-24 left-1/2 bg-[#333] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 z-50"
          >
            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: copiedColor }} />
            <span className="text-xs tracking-wider uppercase font-sans">Copied {copiedColor}</span>
            <Check size={14} className="text-green-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
