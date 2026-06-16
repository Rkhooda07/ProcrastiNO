// `@expo/metro-runtime` must be the first import for Fast Refresh.
import '@expo/metro-runtime';

import React from 'react';
import { ExpoRoot } from 'expo-router/build/ExpoRoot';
import { Head } from 'expo-router/build/head';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { ctx } from 'expo-router/_ctx';

function App() {
  return (
    <Head.Provider>
      <ExpoRoot context={ctx} />
    </Head.Provider>
  );
}

renderRootComponent(App);
