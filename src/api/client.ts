import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { CONFIG } from "../config";

// حفظ الجلسة مشفّرة في مخزن الجهاز الآمن (Keychain / Keystore)
const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
  auth: {
    storage: Platform.OS !== "web" ? ExpoSecureStoreAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
