import React, { forwardRef } from 'react';
import PagerView from 'react-native-pager-view';

interface PagerProps {
  children: React.ReactNode[];
  initialPage?: number;
  onPageSelected?: (e: any) => void;
  style?: any;
}

export const Pager = forwardRef<any, PagerProps>(({ children, initialPage = 0, onPageSelected, style }, ref) => {
  return (
    <PagerView
      ref={ref}
      style={style}
      initialPage={initialPage}
      onPageSelected={onPageSelected}
    >
      {children}
    </PagerView>
  );
});
