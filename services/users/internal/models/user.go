package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID             uuid.UUID          `json:"id" db:"id"`
	Email          string             `json:"email" db:"email"`
	PasswordHash   string             `json:"-" db:"password_hash"`
	AuthProvider   string             `json:"auth_provider,omitempty" db:"auth_provider"`
	AuthProviderID string             `json:"-" db:"auth_provider_id"`
	EmailVerified  bool               `json:"email_verified" db:"email_verified"`
	Profile        UserProfile        `json:"profile" db:"profile"`
	CreatedAt      time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at" db:"updated_at"`
}

// UserProfile contains additional user information
type UserProfile struct {
	DisplayName     string   `json:"display_name,omitempty"`
	AvatarURL       string   `json:"avatar_url,omitempty"`
	FavoriteTeams   []string `json:"favorite_teams,omitempty"`
	FavoriteSports  []string `json:"favorite_sports,omitempty"`
	Timezone        string   `json:"timezone,omitempty"`
	NotificationPref NotificationPreferences `json:"notification_preferences"`
}

// NotificationPreferences contains user notification settings
type NotificationPreferences struct {
	PushEnabled     bool     `json:"push_enabled"`
	EmailEnabled    bool     `json:"email_enabled"`
	AlertTypes      []string `json:"alert_types"`
	QuietHoursStart string   `json:"quiet_hours_start,omitempty"`
	QuietHoursEnd   string   `json:"quiet_hours_end,omitempty"`
}

// Subscription represents a user's subscription
type Subscription struct {
	ID                   uuid.UUID  `json:"id" db:"id"`
	UserID               uuid.UUID  `json:"user_id" db:"user_id"`
	Plan                 string     `json:"plan" db:"plan"`
	Status               string     `json:"status" db:"status"`
	StripeSubscriptionID string     `json:"-" db:"stripe_subscription_id"`
	CurrentPeriodStart   time.Time  `json:"current_period_start" db:"current_period_start"`
	CurrentPeriodEnd     time.Time  `json:"current_period_end" db:"current_period_end"`
	CancelAtPeriodEnd    bool       `json:"cancel_at_period_end" db:"cancel_at_period_end"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
}

// Plan represents a subscription plan
type Plan struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	PriceMonth  int      `json:"price_month"`
	PriceYear   int      `json:"price_year"`
	Features    []string `json:"features"`
}

// SubscriptionPlans defines available plans
var SubscriptionPlans = []Plan{
	{
		ID:          "free",
		Name:        "Free",
		Description: "Basic predictions for casual users",
		PriceMonth:  0,
		PriceYear:   0,
		Features: []string{
			"3 sports (NBA, NFL, MLB)",
			"Basic confidence scores",
			"3 push notifications/day",
			"30-day accuracy history",
		},
	},
	{
		ID:          "pro",
		Name:        "Pro",
		Description: "Advanced predictions for serious bettors",
		PriceMonth:  2900,
		PriceYear:   24900,
		Features: []string{
			"All sports",
			"Detailed confidence scores",
			"Full prediction explanations",
			"10 live predictions/day",
			"5 custom alerts",
			"Odds comparison (10 books)",
			"50 player props/day",
		},
	},
	{
		ID:          "elite",
		Name:        "Elite",
		Description: "Complete access for professionals",
		PriceMonth:  7900,
		PriceYear:   69900,
		Features: []string{
			"Everything in Pro",
			"Unlimited live predictions",
			"Unlimited custom alerts",
			"Scenario Engine",
			"All player props",
			"Sharp movement alerts",
			"Model backtesting",
			"Priority support",
		},
	},
	{
		ID:          "api",
		Name:        "API",
		Description: "Programmatic access for developers",
		PriceMonth:  29900,
		PriceYear:   0, // Annual not available
		Features: []string{
			"Full API access",
			"Raw probability outputs",
			"Webhook support",
			"10,000 requests/month included",
			"Historical data exports",
			"99.9% uptime SLA",
		},
	},
}

// Alert represents a user-configured alert
type Alert struct {
	ID        uuid.UUID   `json:"id" db:"id"`
	UserID    uuid.UUID   `json:"user_id" db:"user_id"`
	Name      string      `json:"name" db:"name"`
	AlertType string      `json:"alert_type" db:"alert_type"`
	Config    AlertConfig `json:"config" db:"config"`
	Enabled   bool        `json:"enabled" db:"enabled"`
	CreatedAt time.Time   `json:"created_at" db:"created_at"`
}

// AlertConfig contains alert configuration
type AlertConfig struct {
	Sport      string           `json:"sport,omitempty"`
	Conditions []AlertCondition `json:"conditions"`
	Delivery   []string         `json:"delivery"`
}

// AlertCondition represents a single condition for an alert
type AlertCondition struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

// APIKey represents an API key for API tier users
type APIKey struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	UserID           uuid.UUID  `json:"user_id" db:"user_id"`
	KeyHash          string     `json:"-" db:"key_hash"`
	Name             string     `json:"name" db:"name"`
	Permissions      []string   `json:"permissions" db:"permissions"`
	RateLimitPerMin  int        `json:"rate_limit_per_minute" db:"rate_limit_per_minute"`
	LastUsedAt       *time.Time `json:"last_used_at,omitempty" db:"last_used_at"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	RevokedAt        *time.Time `json:"revoked_at,omitempty" db:"revoked_at"`
}
