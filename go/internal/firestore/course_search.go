package firestore

import (
	"context"
	"strings"

	"cloud.google.com/go/firestore"
	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/types"
)

// runs bounded prefix queries against Firestore
// instead of scanning and caching the entire courses collection in memory
// improvements with this: 10k+ reads to 20 reads per search
func SearchCourses(ctx context.Context, query string, limit int) ([]types.Course, error) {
	if Client == nil {
		return nil, nil
	}

	query = strings.TrimSpace(query)
	if len(query) < 2 {
		return []types.Course{}, nil
	}
	if limit <= 0 {
		limit = 20
	}

	upperQuery := strings.ToUpper(query)
	titleQuery := strings.ToLower(query)

	seen := make(map[string]struct{})
	results := make([]types.Course, 0, limit)

	appendDocs := func(docs []types.Course) {
		for _, c := range docs {
			if c.ID == "" {
				continue
			}
			if _, exists := seen[c.ID]; exists {
				continue
			}
			seen[c.ID] = struct{}{}
			results = append(results, c)
			if len(results) >= limit {
				return
			}
		}
	}

	// first search by course ID prefix, then by title prefix
	// this way if user searches "CS110" they get exact matches first,
	// then if they search "Intro to CS" they get title matches
	remaining := limit - len(results)
	idMatches, err := queryCoursesByPrefix(ctx, "id", upperQuery, remaining)
	if err != nil {
		return nil, err
	}
	appendDocs(idMatches)
	if len(results) >= limit {
		return results, nil
	}

	remaining = limit - len(results)
	titleMatches, err := queryCoursesByPrefix(ctx, "title", titleQuery, remaining)
	if err != nil {
		return nil, err
	}
	appendDocs(titleMatches)

	return results, nil
}

// run a prefix query against a specific field, either "id" or "title" with the given prefix and limit
func queryCoursesByPrefix(ctx context.Context, field, prefix string, limit int) ([]types.Course, error) {
	if limit <= 0 {
		return []types.Course{}, nil
	}

	// range query: start at prefix, end at prefix + \uf8ff to get all values that start with the prefix
	iter := Client.Collection("courses").
		OrderBy(field, firestore.Asc).
		StartAt(prefix).
		EndAt(prefix + "\uf8ff").
		Limit(limit).
		Documents(ctx)
	defer iter.Stop()

	docs, err := iter.GetAll()
	if err != nil {
		return nil, err
	}

	courses := make([]types.Course, 0, len(docs))
	for _, doc := range docs {
		var c types.Course
		if err := doc.DataTo(&c); err != nil {
			continue
		}
		courses = append(courses, c)
	}

	return courses, nil
}
