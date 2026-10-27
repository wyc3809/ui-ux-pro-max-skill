require("react-native-reanimated").setUpTests?.();
jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success", Warning: "warning" },
}));
jest.mock("react-native-mmkv", () => {
  const createMMKV = () => {
    const m = new Map();
    return {
      getString: (k) => m.get(k),
      set: (k, v) => m.set(k, String(v)),
      remove: (k) => m.delete(k),
    };
  };
  return { createMMKV };
});
// Icon fonts load real assets; in tests a glyph is just its name.
jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text } = require("react-native");
  const Ionicons = ({ name }) => require("react").createElement(Text, null, name);
  Ionicons.font = {};
  return { __esModule: true, default: Ionicons };
});
jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  signInAsync: jest.fn(),
  formatFullName: jest.fn(() => ""),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
