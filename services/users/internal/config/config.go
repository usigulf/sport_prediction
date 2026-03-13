package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	Env         string
	Port        string
	DatabaseURL string
	RedisURL    string
	JWT         JWTConfig
	Stripe      StripeConfig
}

type JWTConfig struct {
	Secret           string
	AccessExpiresIn  time.Duration
	RefreshExpiresIn time.Duration
}

type StripeConfig struct {
	SecretKey     string
	WebhookSecret string
}

func Load() (*Config, error) {
	cfg := &Config{
		Env:         getEnv("ENV", "development"),
		Port:        getEnv("PORT", "3001"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		JWT: JWTConfig{
			Secret:           getEnv("JWT_SECRET", ""),
			AccessExpiresIn:  parseDuration(getEnv("JWT_EXPIRES_IN", "15m")),
			RefreshExpiresIn: parseDuration(getEnv("REFRESH_TOKEN_EXPIRES_IN", "7d")),
		},
		Stripe: StripeConfig{
			SecretKey:     getEnv("STRIPE_SECRET_KEY", ""),
			WebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET", ""),
		},
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JWT.Secret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		// Handle special case for days
		if len(s) > 1 && s[len(s)-1] == 'd' {
			days := 0
			fmt.Sscanf(s, "%dd", &days)
			return time.Duration(days) * 24 * time.Hour
		}
		return 15 * time.Minute
	}
	return d
}
