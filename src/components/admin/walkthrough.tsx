
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
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const activeStep = steps[currentStep];
    if (isOpen && activeStep) {
      try {
        const element = document.querySelector<HTMLElement>(activeStep.element);
        
        if (targetElement && element !== targetElement) {
           targetElement.classList.remove('walkthrough-highlight');
        }

        if (element) {
          setTargetElement(element);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          element.classList.add('walkthrough-highlight');

          const updatePosition = () => {
            const rect = element.getBoundingClientRect();
            setTargetPosition({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            });
          }

          // Delay to allow for scroll animation
          const timeoutId = setTimeout(updatePosition, 300); 
          
          return () => {
              clearTimeout(timeoutId);
              element.classList.remove('walkthrough-highlight');
          }

        } else {
          onClose(); // Close if element not found
        }
      } catch (e) {
        console.error("Walkthrough selector error:", e);
        onClose();
      }
    } else if (targetElement) {
       targetElement.classList.remove('walkthrough-highlight');
       setTargetElement(null);
    }
  }, [isOpen, currentStep, steps, onClose, targetElement]);
  
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
    if(targetElement) {
        targetElement.classList.remove('walkthrough-highlight');
    }
    setTargetPosition(null);
    setCurrentStep(0);
    onClose();
  };
  
  if (!isOpen || !targetPosition) {
    return null;
  }
  
  const tooltipYPosition = targetPosition.top > window.innerHeight / 2 
    ? targetPosition.top - 16 
    : targetPosition.top + targetPosition.height + 16;
    
  const tooltipTransformY = targetPosition.top > window.innerHeight / 2 ? '-100%' : '0%';

  return (
    <AnimatePresence>
      {isOpen && targetPosition && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-background/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Tooltip */}
          <motion.div
            key={currentStep}
            className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-[102]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
                opacity: 1, 
                top: tooltipYPosition, 
                transform: `translate(-50%, ${tooltipTransformY})`,
                transition: { type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }
            }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="bg-card text-card-foreground p-4 rounded-lg shadow-2xl space-y-4 border">
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
