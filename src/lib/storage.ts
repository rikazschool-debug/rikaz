import * as SecureStore from "expo-secure-store";

/** مفتاح الصفة النشطة، بالاسم نفسه المستخدم في المنصة */
const ACTIVE_KEY = "rikaz.activeContext";

export async function readActiveKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export async function saveActiveKey(key: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACTIVE_KEY, key);
  } catch {
    // التخزين اختياري: عند الفشل يُطلب اختيار الصفة في المرة القادمة
  }
}

export async function clearActiveKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACTIVE_KEY);
  } catch {
    // لا شيء
  }
}
