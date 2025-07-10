
'use client';

import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import Image from 'next/image';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ImageFullscreenViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export function ImageFullscreenViewer({ isOpen, onClose, imageUrl }: ImageFullscreenViewerProps) {
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image itself
            className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center"
          >
            <Image
              src={imageUrl}
              alt="Fullscreen view"
              fill
              style={{ objectFit: 'contain' }}
              className="pointer-events-none"
            />
          </motion.div>
           <button
            onClick={onClose}
            aria-label="Close fullscreen image"
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/75 transition-colors z-[101]"
           >
             <X className="h-6 w-6" />
             <span className="sr-only">Close</span>
           </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
