
'use client';

import { useState, useEffect, useCallback } from 'react';
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

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    };
  },
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};


export function ImageFullscreenViewer({ isOpen, onClose, imageUrls = [], startIndex = 0 }: ImageFullscreenViewerProps) {
  const [[page, direction], setPage] = useState([startIndex, 0]);

  useEffect(() => {
    if (isOpen) {
      setPage([startIndex, 0]);
    }
  }, [isOpen, startIndex]);
  
  const imageIndex = page % (imageUrls.length || 1);

  const paginate = (newDirection: number) => {
    if (!imageUrls || imageUrls.length <= 1) return;
    setPage([page + newDirection, newDirection]);
  };

  const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      paginate(1);
    } else if (swipe > swipeConfidenceThreshold) {
      paginate(-1);
    }
    
    if (offset.y > 100) {
      onClose();
    }
  };
  
  const currentImageUrl = imageUrls[imageIndex];

  return (
    <AnimatePresence initial={false} custom={direction}>
      {isOpen && currentImageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Main Content Area that stops propagation */}
          <motion.div
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Image with Drag Gestures */}
            <motion.div
              key={page}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="absolute w-full h-full max-w-7xl max-h-[90vh] cursor-grab active:cursor-grabbing"
            >
              <Image
                src={currentImageUrl}
                alt={`Fullscreen view ${imageIndex + 1}`}
                fill
                style={{ objectFit: 'contain' }}
                className="pointer-events-none"
                priority
              />
            </motion.div>
          </motion.div>


           {/* UI Controls */}
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
                        onClick={(e) => { e.stopPropagation(); paginate(-1); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/75 transition-colors z-[101]"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); paginate(1); }}
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
                                    setPage([index, index > imageIndex ? 1 : -1]);
                                }}
                                className={cn(
                                    'w-2 h-2 rounded-full transition-colors',
                                    imageIndex === index ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
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
