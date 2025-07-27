
'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';

interface Step {
  element: string;
  intro: string;
}

interface WalkthroughProps {
  isOpen: boolean;
  steps: Step[];
  onClose: () => void;
}

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function Walkthrough({ isOpen, steps, onClose }: WalkthroughProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    if (isOpen && steps[currentStep]) {
      try {
        const element = document.querySelector(steps[currentStep].element);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        } else {
          // If element not found, close the walkthrough to prevent errors
          onClose();
        }
      } catch (e) {
        console.error("Walkthrough selector error:", e);
        onClose();
      }
    }
  }, [isOpen, currentStep, steps, onClose]);
  
  useEffect(() => {
      if (isOpen) {
          document.body.style.overflow = 'hidden';
      } else {
          document.body.style.overflow = '';
      }
      return () => {
          document.body.style.overflow = '';
      };
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };
  
  const handlePrev = () => {
      if (currentStep > 0) {
          setCurrentStep(currentStep -1);
      }
  }

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };
  
  const tooltipYPosition = targetPosition && targetPosition.top > window.innerHeight / 2 ? targetPosition.top - 16 : (targetPosition?.top ?? 0) + (targetPosition?.height ?? 0) + 16;
  const tooltipTransformY = targetPosition && targetPosition.top > window.innerHeight / 2 ? '-100%' : '0%';

  return (
    <AnimatePresence>
      {isOpen && targetPosition && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Highlight Box & Overlay */}
          <motion.div
            className="absolute rounded-lg"
            initial={false}
            animate={{
              left: targetPosition.left - 8,
              top: targetPosition.top - 8,
              width: targetPosition.width + 16,
              height: targetPosition.height + 16,
              transition: { type: 'spring', stiffness: 300, damping: 30 }
            }}
            style={{
                boxShadow: '0 0 0 9999px hsla(0, 0%, 0%, 0.6)',
            }}
          />

          {/* Tooltip */}
          <motion.div
            key={currentStep}
            className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
                opacity: 1, 
                top: tooltipYPosition, 
                transform: `translate(-50%, ${tooltipTransformY})`,
                transition: { type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }
            }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="bg-card text-card-foreground p-4 rounded-lg shadow-2xl space-y-4">
              <p>{steps[currentStep].intro}</p>
              <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{currentStep + 1} / {steps.length}</span>
                <div className="flex gap-2">
                  {steps.length > 1 && currentStep > 0 && (
                      <Button variant="ghost" onClick={handlePrev}>
                        {t('admin_walkthrough_prev')}
                      </Button>
                  )}
                  <Button onClick={handleNext}>
                    {currentStep === steps.length - 1 ? t('admin_walkthrough_done') : t('admin_walkthrough_next')}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
