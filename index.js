// `@expo/metro-runtime` must be the first import for Fast Refresh.
import '@expo/metro-runtime';

import React from 'react';
import { Platform } from 'react-native';
import { ExpoRoot } from 'expo-router/build/ExpoRoot';
import { Head } from 'expo-router/build/head';
import 'expo-router/build/fast-refresh';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { ctx } from 'expo-router/_ctx';

function App() {
  return React.createElement(
    Head.Provider,
    null,
    React.createElement(ExpoRoot, {
      context: ctx,
      location: Platform.OS === 'android' ? '/' : undefined,
    })
  );
}

renderRootComponent(App);
