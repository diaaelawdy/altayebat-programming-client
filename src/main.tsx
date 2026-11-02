import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'framer-motion';
import { queryClient } from '@/lib/queryClient';
import { PreferencesProvider } from '@/theme/PreferencesProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/Confirm';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        {/* Honors the OS "reduce motion" setting for every animation. */}
        <MotionConfig reducedMotion="user">
          <LazyMotion features={() => import('@/lib/motionFeatures').then((r) => r.default)} strict>
            <ToastProvider>
              <ConfirmProvider>
                <App />
              </ConfirmProvider>
            </ToastProvider>
          </LazyMotion>
        </MotionConfig>
      </PreferencesProvider>
    </QueryClientProvider>
  </StrictMode>,
);
