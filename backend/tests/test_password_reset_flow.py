"""P3-002: password reset flow wired in backend and mobile."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MOBILE = REPO_ROOT / "mobile"
BACKEND_AUTH = REPO_ROOT / "backend" / "app" / "api" / "v1" / "auth.py"


def test_auth_exposes_forgot_and_reset_endpoints():
    text = BACKEND_AUTH.read_text(encoding="utf-8")
    assert '"/forgot-password"' in text
    assert '"/reset-password"' in text
    assert "request_password_reset" in text
    assert "reset_password_with_token" in text


def test_login_links_to_forgot_password():
    text = (MOBILE / "src/screens/LoginScreen.tsx").read_text(encoding="utf-8")
    assert "Forgot password?" in text
    assert "navigate('ForgotPassword')" in text


def test_forgot_password_calls_api():
    text = (MOBILE / "src/screens/ForgotPasswordScreen.tsx").read_text(encoding="utf-8")
    assert "forgotPassword" in text
    assert "setSubmitted(true)" in text


def test_reset_password_screen_and_deep_link():
    linking = (MOBILE / "src/navigation/linking.ts").read_text(encoding="utf-8")
    navigator = (MOBILE / "src/navigation/AppNavigator.tsx").read_text(encoding="utf-8")
    reset = (MOBILE / "src/screens/ResetPasswordScreen.tsx").read_text(encoding="utf-8")
    api = (MOBILE / "src/services/api.ts").read_text(encoding="utf-8")

    assert "reset-password" in linking
    assert "ResetPassword" in navigator
    assert "resetPassword" in api
    assert "completeSignInWithTokens" in reset


def test_web_reset_redirect_page_exists():
    html = (REPO_ROOT / "web" / "reset-password.html").read_text(encoding="utf-8")
    assert "com.sportsprediction.app://reset-password" in html
