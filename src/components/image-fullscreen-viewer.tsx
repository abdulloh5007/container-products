
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
      x: direction > 0 ? '100%' : '-100%',
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
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    };
  },
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};


export function ImageFullscreenViewer({ isOpen, onClose, imageUrls = [], startIndex = 0 }: ImageFullscreenViewerProps) {
  const [[page, direction], setPage] = useState([0, 0]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Reset page to the specified startIndex when the viewer is opened
    if (isOpen) {
      setPage([startIndex, 0]);
    }
  }, [isOpen, startIndex]);
  
  // This ensures the page index is always valid
  const imageIndex = page % (imageUrls.length || 1);

  const paginate = (newDirection: number) => {
    if (!imageUrls || imageUrls.length <= 1) return;
    setPage([page + newDirection, newDirection]);
  };

  const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    setIsDragging(false);
    const swipeX = swipePower(offset.x, velocity.x);
    const swipeY = swipePower(offset.y, velocity.y);

    if (Math.abs(offset.x) > Math.abs(offset.y)) { // Horizontal swipe
        if (swipeX < -swipeConfidenceThreshold) {
          paginate(1);
        } else if (swipeX > swipeConfidenceThreshold) {
          paginate(-1);
        }
    } else { // Vertical swipe
        if (swipeY > swipeConfidenceThreshold) {
             onClose();
        }
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
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={onClose} // Close on background click
        >
            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 } }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={onClose}
              aria-label="Close fullscreen image"
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/75 transition-colors z-[102]"
            >
                <X className="h-6 w-6" />
            </motion.button>

            {/* Pagination Dots */}
            {imageUrls.length > 1 && (
                 <motion.div 
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-[101]"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
                    exit={{ y: 20, opacity: 0 }}
                 >
                    {imageUrls.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                const newDirection = i > imageIndex ? 1 : -1;
                                setPage([i, newDirection]);
                            }}
                            className={cn(
                                'w-2 h-2 rounded-full transition-colors',
                                imageIndex === i ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'
                            )}
                            aria-label={`Go to image ${i + 1}`}
                        />
                    ))}
                </motion.div>
            )}

            {/* Image Container */}
            <motion.div
                className="relative w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image area
            >
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                      key={page}
                      className="absolute w-full h-full max-w-7xl max-h-[90vh]"
                      custom={direction}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                      drag
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      dragElastic={0.2}
                      onDragStart={() => setIsDragging(true)}
                      onDragEnd={handleDragEnd}
                    >
                         <Image
                            src={currentImageUrl}
                            alt={`Fullscreen view ${imageIndex + 1}`}
                            fill
                            style={{ objectFit: 'contain' }}
                            className={cn("pointer-events-none", isDragging ? "cursor-grabbing" : "cursor-grab")}
                            priority
                         />
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
