"""PH2-008: Annual Premium subscription plan."""
from pathlib import Path

import pytest

from app.api.v1 import subscription as sub_mod
from app.config import Settings

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_stripe_price_id_for_annual_premium(monkeypatch):
    monkeypatch.setattr(
        sub_mod.settings,
        "stripe_price_id_premium",
        "price_monthly",
        raising=False,
    )
    monkeypatch.setattr(
        sub_mod.settings,
        "stripe_price_id_premium_annual",
        "price_annual",
        raising=False,
    )
    assert sub_mod._price_id_for_tier("premium", "monthly") == "price_monthly"
    assert sub_mod._price_id_for_tier("premium", "annual") == "price_annual"


def test_stripe_price_id_annual_falls_back_to_monthly(monkeypatch):
    monkeypatch.setattr(
        sub_mod.settings,
        "stripe_price_id_premium",
        "price_monthly",
        raising=False,
    )
    monkeypatch.setattr(
        sub_mod.settings,
        "stripe_price_id_premium_annual",
        None,
        raising=False,
    )
    assert sub_mod._price_id_for_tier("premium", "annual") == "price_monthly"


def test_tier_from_stripe_subscription_recognizes_annual_price():
    settings = Settings(
        jwt_secret="x" * 32,
        stripe_price_id_premium="price_monthly",
        stripe_price_id_premium_annual="price_annual",
        stripe_price_id_premium_plus="price_plus",
    )
    tier = sub_mod._tier_from_stripe_subscription(
        {"items": {"data": [{"price": {"id": "price_annual"}}]}},
        settings,
    )
    assert tier == "premium"


def test_mobile_annual_pricing_constants():
    pricing = (REPO_ROOT / "mobile" / "src" / "constants" / "subscriptionPricing.ts").read_text(
        encoding="utf-8"
    )
    assert "PREMIUM_ANNUAL_PRICE_LABEL" in pricing
    assert "com.octobetiq.premium.annual" in pricing
    assert "premiumAnnualSavingsPercent" in pricing


def test_paywall_supports_annual_billing_toggle():
    paywall = (REPO_ROOT / "mobile" / "src" / "screens" / "PaywallScreen.tsx").read_text(
        encoding="utf-8"
    )
    assert "billingPeriod" in paywall
    assert "billingToggle" in paywall
    assert "Premium Annual" in paywall
    assert "annualBillingAvailable" in paywall


def test_purchases_detects_annual_packages():
    purchases = (REPO_ROOT / "mobile" / "src" / "services" / "purchases.ts").read_text(
        encoding="utf-8"
    )
    assert "billingPeriod" in purchases
    assert "billingPeriodForPackage" in purchases


@pytest.mark.parametrize(
    "env_file",
    [
        REPO_ROOT / ".env.example",
        REPO_ROOT / ".env.production.example",
        REPO_ROOT / "backend" / ".env.example",
    ],
)
def test_env_examples_document_annual_stripe_price(env_file):
    text = env_file.read_text(encoding="utf-8")
    assert "STRIPE_PRICE_ID_PREMIUM_ANNUAL" in text
