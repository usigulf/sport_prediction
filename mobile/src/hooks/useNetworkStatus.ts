import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export type NetworkStatus = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  /** True when the device has no usable connection. */
  isOffline: boolean;
};

function deriveOffline(state: NetInfoState): boolean {
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}

function toNetworkStatus(state: NetInfoState): NetworkStatus {
  return {
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
    isOffline: deriveOffline(state),
  };
}

/**
 * Subscribes to NetInfo and exposes a stable offline flag for UI (banner, fetch gating).
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
    isOffline: false,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus(toNetworkStatus(state));
    });
    void NetInfo.fetch().then((state) => {
      setStatus(toNetworkStatus(state));
    });
    return unsubscribe;
  }, []);

  return status;
}
