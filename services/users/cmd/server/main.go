package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/sportoracle/users/internal/config"
	"github.com/sportoracle/users/internal/handlers"
	"github.com/sportoracle/users/internal/middleware"
	"github.com/sportoracle/users/internal/repository"
	"github.com/sportoracle/users/internal/service"
)

func main() {
	// Initialize logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("ENV") == "development" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load configuration")
	}

	// Initialize database connection
	db, err := repository.NewPostgresDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()

	// Initialize Redis
	redis, err := repository.NewRedisClient(cfg.RedisURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	defer redis.Close()

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	subscriptionRepo := repository.NewSubscriptionRepository(db)
	sessionRepo := repository.NewSessionRepository(redis)

	// Initialize services
	authService := service.NewAuthService(userRepo, sessionRepo, cfg.JWT)
	userService := service.NewUserService(userRepo)
	subscriptionService := service.NewSubscriptionService(subscriptionRepo, cfg.Stripe)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	subscriptionHandler := handlers.NewSubscriptionHandler(subscriptionService)
	healthHandler := handlers.NewHealthHandler(db, redis)

	// Setup Gin router
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.CORS())
	router.Use(middleware.RequestID())

	// Health routes
	router.GET("/health", healthHandler.Health)
	router.GET("/ready", healthHandler.Ready)

	// API v1 routes
	v1 := router.Group("/v1")
	{
		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
			auth.POST("/oauth/:provider", authHandler.OAuthLogin)
		}

		// Protected routes
		protected := v1.Group("/")
		protected.Use(middleware.Auth(cfg.JWT.Secret))
		{
			// User routes
			users := protected.Group("/users")
			{
				users.GET("/me", userHandler.GetCurrentUser)
				users.PATCH("/me", userHandler.UpdateCurrentUser)
				users.DELETE("/me", userHandler.DeleteCurrentUser)
				users.POST("/me/preferences", userHandler.UpdatePreferences)
			}

			// Subscription routes
			subscriptions := protected.Group("/subscriptions")
			{
				subscriptions.GET("/", subscriptionHandler.GetSubscription)
				subscriptions.POST("/", subscriptionHandler.CreateSubscription)
				subscriptions.PATCH("/", subscriptionHandler.UpdateSubscription)
				subscriptions.DELETE("/", subscriptionHandler.CancelSubscription)
				subscriptions.GET("/plans", subscriptionHandler.ListPlans)
			}

			// Logout
			protected.POST("/auth/logout", authHandler.Logout)
		}
	}

	// Stripe webhook (separate, no auth)
	router.POST("/webhooks/stripe", subscriptionHandler.HandleStripeWebhook)

	// Create server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Info().Str("port", cfg.Port).Msg("Starting Users Service")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited properly")
}
