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
import { useMenuStore } from './src/store/menuStore';
import { connectDeviceSocket, disconnectDeviceSocket } from './src/api/socket';

const App = () => {
  useEffect(() => {
    // Lock to portrait — the tabletop is fixed-orientation.
    Orientation.lockToPortrait();

    // Hydrate menu from the device-api and open the live socket.
    // Both fail soft: menu falls back to bundled mock data, socket retries.
    useMenuStore.getState().hydrate();
    connectDeviceSocket();
    return () => disconnectDeviceSocket();
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
