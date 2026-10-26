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
