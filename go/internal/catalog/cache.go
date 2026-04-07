package catalog

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"

	"cloud.google.com/go/firestore"
	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/types"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var (
	cacheMu     sync.RWMutex   // lock to prevent reading while writing
	CourseCache []types.Course // actual list of courses in RAM
)

// fetches all courses from firestore once
// NOTE: called at server startup to warm up the cache
func LoadCache(ctx context.Context, client *firestore.Client) error {
	log.Println("warming up course cache...")
	if client == nil {
		return errors.New("firestore client is nil")
	}

	// Optimization: We only need metadata for the search bar.
	// We don't need 'SectionIDs' or 'Description' here if we want to save RAM,
	// but loading everything is fine for ~5000 courses.
	iter := client.Collection("courses").Documents(ctx)

	tempCache := []types.Course{}

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			if st, ok := status.FromError(err); ok {
				switch st.Code() {
				case codes.PermissionDenied:
					return fmt.Errorf("firestore permission denied while reading courses. Ensure the active principal has IAM role roles/datastore.user (or higher) for project/database: %w", err)
				case codes.FailedPrecondition:
					return fmt.Errorf("firestore API data access is disabled for this database. Enable Firestore API data access in the Google Cloud console: %w", err)
				}
			}
			return err
		}

		var c types.Course
		if err := doc.DataTo(&c); err != nil {
			continue
		}
		tempCache = append(tempCache, c)
	}

	// lock the cache and swap the data
	cacheMu.Lock()
	CourseCache = tempCache
	cacheMu.Unlock()

	log.Printf("cache loaded: %d courses ready in RAM.", len(CourseCache))
	return nil
}

// filters the in-memory list
// this will only take microseconds to run
// very efficient very likey
func SearchCourses(query string) []types.Course {
	cacheMu.RLock()
	defer cacheMu.RUnlock()

	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return []types.Course{}
	}

	var results []types.Course
	count := 0

	for _, c := range CourseCache {
		// search by ID ("CS110") or title ("Principles")
		if strings.Contains(strings.ToLower(c.ID), query) ||
			strings.Contains(strings.ToLower(c.Title), query) {

			results = append(results, c)
			count++

			// limit results to 20 entries
			if count >= 20 {
				break
			}
		}
	}
	return results
}
