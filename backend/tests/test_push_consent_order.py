"""P3-001: push registration must follow onboarding opt-in, not login/cold-start defaults."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MOBILE = REPO_ROOT / "mobile"


def test_push_default_is_opt_out():
    text = (MOBILE / "src/utils/settingsStorage.ts").read_text(encoding="utf-8")
    assert "if (raw === null) return false" in text


def test_sign_in_does_not_register_push_directly():
    text = (MOBILE / "src/utils/signIn.ts").read_text(encoding="utf-8")
    assert "syncPushRegistrationAfterConsent" in text
    assert "registerPushTokenIfPossible" not in text


def test_app_cold_start_uses_sync_after_consent():
    text = (MOBILE / "App.tsx").read_text(encoding="utf-8")
    assert "syncPushRegistrationAfterConsent" in text
    assert "registerPushTokenIfPossible" not in text


def test_push_register_gates_os_permission_prompt():
    text = (MOBILE / "src/utils/pushNotifications.ts").read_text(encoding="utf-8")
    assert "requestPermission" in text
    assert "getOnboardingComplete" in text
    assert "if (!options.requestPermission) return" in text


def test_onboarding_requests_permission_only_on_opt_in():
    text = (MOBILE / "src/screens/OnboardingScreen.tsx").read_text(encoding="utf-8")
    assert "registerPushTokenIfPossible({ requestPermission: true })" in text


def test_settings_requests_permission_on_enable():
    text = (MOBILE / "src/screens/SettingsScreen.tsx").read_text(encoding="utf-8")
    assert "registerPushTokenIfPossible({ requestPermission: true })" in text
