/**
 * Hyperglow Tabletop — root app component.
 *
 * Wires:
 *   - NativeWind global stylesheet (imported once)
 *   - SafeAreaProvider for notched / display-cutout devices
 *   - GestureHandlerRootView (required by react-navigation drawer/stack gestures)
 *   - Portrait lock (the tabletop is permanently in portrait)
 *   - RootNavigator (all screens)
 */

import './global.css';

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Orientation from 'react-native-orientation-locker';

import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/constants/colors';

const App = () => {
  useEffect(() => {
    // Lock to portrait — the tabletop is fixed-orientation.
    // Comment this out (or call unlockAllOrientations) if you want to
    // experiment with landscape on the 1024×600 hardware.
    Orientation.lockToPortrait();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
