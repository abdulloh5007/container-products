
'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageFullscreenViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrls?: string[];
  startIndex?: number;
}

export function ImageFullscreenViewer({ isOpen, onClose, imageUrls = [], startIndex = 0 }: ImageFullscreenViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
    }
  }, [isOpen, startIndex]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    } else if (info.offset.x > 50 && imageUrls.length > 1) {
      goToPrevious();
    } else if (info.offset.x < -50 && imageUrls.length > 1) {
      goToNext();
    }
  };
  
  const goToPrevious = () => {
    if (imageUrls.length > 1) {
        const isFirst = currentIndex === 0;
        const newIndex = isFirst ? imageUrls.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    }
  };

  const goToNext = () => {
     if (imageUrls.length > 1) {
        const isLast = currentIndex === imageUrls.length - 1;
        const newIndex = isLast ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    }
  };
  
  const currentImageUrl = imageUrls[currentIndex];

  return (
    <AnimatePresence>
      {isOpen && currentImageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key={currentIndex}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <Image
              src={currentImageUrl}
              alt="Fullscreen view"
              fill
              style={{ objectFit: 'contain' }}
              className="pointer-events-none"
              priority
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
           
            {imageUrls.length > 1 && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/75 transition-colors z-[101]"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/75 transition-colors z-[101]"
                        aria-label="Next image"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {imageUrls.map((_, index) => (
                             <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentIndex(index);
                                }}
                                className={cn(
                                    'w-2 h-2 rounded-full transition-colors',
                                    currentIndex === index ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
                                )}
                                aria-label={`Go to image ${index + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}

        </motion.div>
      )}
    </AnimatePresence>
  );
}
