import React, { forwardRef } from 'react';
import { View, ScrollView, Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

interface PagerProps {
  children: React.ReactNode[];
  initialPage?: number;
  onPageSelected?: (e: any) => void;
  style?: any;
}

export const Pager = forwardRef<any, PagerProps>(({ children, initialPage = 0, onPageSelected, style }, ref) => {
  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={(e) => {
        const contentOffset = e.nativeEvent.contentOffset.x;
        const page = Math.round(contentOffset / width);
        if (onPageSelected) {
          onPageSelected({ nativeEvent: { position: page } });
        }
      }}
      style={[style, { flex: 1 }]}
      contentOffset={{ x: initialPage * width, y: 0 }}
    >
      {React.Children.map(children, (child, index) => (
        <View key={index} style={{ width, flex: 1 }}>
          {child}
        </View>
      ))}
    </ScrollView>
  );
});
