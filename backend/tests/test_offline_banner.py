"""P3-003: NetInfo subscription and global offline banner."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MOBILE = REPO_ROOT / "mobile"


def test_netinfo_dependency_present():
    pkg = (MOBILE / "package.json").read_text(encoding="utf-8")
    assert "@react-native-community/netinfo" in pkg


def test_network_status_hook_subscribes_to_netinfo():
    text = (MOBILE / "src/hooks/useNetworkStatus.ts").read_text(encoding="utf-8")
    assert "NetInfo.addEventListener" in text
    assert "NetInfo.fetch" in text
    assert "isOffline" in text


def test_offline_banner_uses_network_hook():
    text = (MOBILE / "src/components/OfflineBanner.tsx").read_text(encoding="utf-8")
    assert "useNetworkStatus" in text
    assert "cloud-offline-outline" in text
    assert "accessibilityRole" in text


def test_app_renders_offline_banner_globally():
    text = (MOBILE / "App.tsx").read_text(encoding="utf-8")
    assert "OfflineBanner" in text
    assert "SafeAreaProvider" in text
