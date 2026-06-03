module.exports = {
  presets: [
    ['module:@react-native/babel-preset'],
    'nativewind/babel',
  ],
  plugins: [
    // Reanimated plugin MUST be last
    'react-native-reanimated/plugin',
  ],
};
