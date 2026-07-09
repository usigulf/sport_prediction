/**
 * Age gate — 17+ informational app (I84). Shown once before first use.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const AGE_GATE_KEY = '@sport_prediction_age_gate_confirmed';

export async function getAgeGateConfirmed(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(AGE_GATE_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setAgeGateConfirmed(): Promise<void> {
  await AsyncStorage.setItem(AGE_GATE_KEY, 'true');
}
