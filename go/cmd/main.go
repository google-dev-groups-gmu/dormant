package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/api"
	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/auth"
	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/catalog"
	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/firestore"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// load env var
	err := godotenv.Load()
	if err != nil {
		log.Fatal(".env file failed to load")
	}

	// init firestore client
	if err := firestore.Init(); err != nil {
		log.Fatalf("Failed to initialize Firestore: %v", err)
	}
	defer firestore.Close()

	// warm up course cache
	// this is a startup task so use context.Background()
	if err := catalog.LoadCache(context.Background(), firestore.Client); err != nil {
		// CRITICAL: stop startup if this fails.
		// the search feature will be broken otherwise and we can't serve requests properly.
		log.Fatalf("Failed to warm up course cache: %v", err)
	}

	// initialize Gin router
	r := gin.Default()

	// CORS configuration
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{os.Getenv("FRONTEND_URL")}
	config.AllowCredentials = true
	config.AddAllowMethods("GET", "POST", "PUT", "DELETE")
	r.Use(cors.New(config))

	// health check route
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "health check ok"})
	})

	// root route
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "GDG GMU Dormant API"})
	})

	// initialize authentication
	auth.NewAuth()

	//  authentication routes
	r.GET("/auth/:provider", auth.SignInWithProvider)
	r.GET("/auth/:provider/callback", auth.CallbackHandler)
	r.GET("/auth/signout", auth.SignOutHandler)
	r.GET("/auth/profile", auth.GetUserProfile)

	// generator route
	r.POST("/api/generate", api.GenerateSchedule)

	// course sections route
	r.GET("/api/search", api.HandleSearchCourses)
	r.GET("/api/sections", api.HandleGetSections)

	// user schedule routes
	r.POST("/api/users/:userID/schedules", api.SaveCurrentSchedule)
	r.GET("/api/users/:userID/schedules", api.GetSavedCurrentSchedules)

	r.Run(":5000")
}
