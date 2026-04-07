package firestore

// like mentioned in auth.go, we are committing to using goth and gothic session management
// we will be CRUD server side instead of client side fetch/writes
// which are implemented here in this file

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"cloud.google.com/go/firestore"
)

var Client *firestore.Client

// NOTE: DO NOT use json key to initialize the client unless you are ready to pay for secret manager
// (it is okay to do in local dev, but bad practice for production and you will have to pay for it)
//
// you will suffer and want to delete everything when you are deploying to GCP under free tier
// hours spent realizing this mistake: ~8

// init firestore client
func Init() error {
	projectID := os.Getenv("GOOGLE_PROJECT_ID")
	if projectID == "" {
		return errors.New("project ID is not set in env variables")
	}

	credentialsPath := strings.TrimSpace(os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"))
	if credentialsPath != "" {
		if _, err := os.Stat(credentialsPath); err != nil {
			return fmt.Errorf("GOOGLE_APPLICATION_CREDENTIALS points to a missing file (%s): %w", credentialsPath, err)
		}

		credentialsBytes, err := os.ReadFile(credentialsPath)
		if err != nil {
			return fmt.Errorf("failed to read GOOGLE_APPLICATION_CREDENTIALS (%s): %w", credentialsPath, err)
		}

		var credentials struct {
			Type        string `json:"type"`
			ProjectID   string `json:"project_id"`
			ClientEmail string `json:"client_email"`
		}
		if err := json.Unmarshal(credentialsBytes, &credentials); err != nil {
			return fmt.Errorf("failed to parse GOOGLE_APPLICATION_CREDENTIALS JSON (%s): %w", credentialsPath, err)
		}

		log.Printf("Using service account credentials: %s (key project=%s)", credentials.ClientEmail, credentials.ProjectID)
		if credentials.ProjectID != "" && credentials.ProjectID != projectID {
			log.Printf("WARNING: key project_id (%s) differs from GOOGLE_PROJECT_ID (%s)", credentials.ProjectID, projectID)
		}
	} else {
		log.Println("GOOGLE_APPLICATION_CREDENTIALS is not set. Using Application Default Credentials (ADC).")
	}

	databaseID := strings.TrimSpace(os.Getenv("GOOGLE_FIRESTORE_DATABASE_ID"))

	var err error
	// using background context so the client lives as long as the app lives
	if databaseID == "" || databaseID == "(default)" {
		Client, err = firestore.NewClient(context.Background(), projectID)
	} else {
		Client, err = firestore.NewClientWithDatabase(context.Background(), projectID, databaseID)
	}
	if err != nil {
		return err
	}

	if databaseID == "" {
		databaseID = "(default)"
	}

	log.Printf("Firestore initialized successfully (project=%s, database=%s)", projectID, databaseID)
	return nil
}

// clean up the firestore client
func Close() {
	if Client != nil {
		Client.Close()
	}
}
