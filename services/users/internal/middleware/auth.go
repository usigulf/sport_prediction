package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Auth middleware validates JWT tokens
func Auth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			return
		}

		tokenString := parts[1]

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		// Set user info in context
		c.Set("user_id", claims["sub"])
		c.Set("email", claims["email"])
		c.Set("plan", claims["plan"])

		c.Next()
	}
}

// RequirePlan middleware checks if user has required subscription plan
func RequirePlan(allowedPlans ...string) gin.HandlerFunc {
	planSet := make(map[string]bool)
	for _, p := range allowedPlans {
		planSet[p] = true
	}

	return func(c *gin.Context) {
		plan, exists := c.Get("plan")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Subscription required"})
			return
		}

		if !planSet[plan.(string)] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":          "Upgrade required",
				"required_plans": allowedPlans,
				"current_plan":   plan,
			})
			return
		}

		c.Next()
	}
}

// RateLimit middleware for API rate limiting
func RateLimit(limiter RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			userID = c.ClientIP()
		}

		allowed, remaining, reset := limiter.Allow(userID.(string))

		c.Header("X-RateLimit-Remaining", string(rune(remaining)))
		c.Header("X-RateLimit-Reset", string(rune(reset)))

		if !allowed {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":     "Rate limit exceeded",
				"remaining": remaining,
				"reset":     reset,
			})
			return
		}

		c.Next()
	}
}

// RateLimiter interface for rate limiting implementations
type RateLimiter interface {
	Allow(key string) (allowed bool, remaining int, reset int64)
}
