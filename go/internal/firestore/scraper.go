package firestore

import (
	"context"
	"fmt"
	"log"

	"cloud.google.com/go/firestore"
	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/types"
)

// saves the high-level course metadata ex) CS101, Title
// we use map to avoid redundant writes in the scraper
func SaveCourse(ctx context.Context, course types.Course) error {
	if Client == nil {
		return nil
	}

	// this will overwrite existing course data if the course ID already exists
	// which is fine since we want the latest data
	_, err := Client.Collection("courses").Doc(course.ID).Set(ctx, course)
	if err != nil {
		log.Printf("Failed to save course %s: %v", course.ID, err)
		return err
	}
	return nil
}

// saves a specific class section ex) CS101-001, Time, Location
func SaveSection(ctx context.Context, section types.Section) error {
	if Client == nil {
		return nil
	}

	_, err := Client.Collection("sections").Doc(section.ID).Set(ctx, section)
	if err != nil {
		return err
	}

	// add this section ID to the parent course's "section_ids" array for optimal querying
	// read courses/{courseID} to get all sections, grab the section_ids array
	// then do a direct batch fetch for those section IDs

	indexPath := "section_ids"
	if section.IsLab {
		indexPath = "lab_section_ids"
	}

	// firestore "ArrayUnion" adds the ID only if it's not already there
	_, err = Client.Collection("courses").Doc(section.CourseID).Update(ctx, []firestore.Update{
		{
			Path:  indexPath,
			Value: firestore.ArrayUnion(section.ID),
		},
	})

	// Note: If the course doc doesn't exist yet, Update() might fail.
	// Since you save the Course object first in your main loop, this is safe.
	if err != nil {
		// Log warning but don't fail the whole scrape
		log.Printf("Warning: Failed to link section %s to course %s: %v", section.ID, section.CourseID, err)
	}

	return nil
}

// fetch all sections for a specific course ID
// "CS110" for example
// uses the "section_ids" index.
func GetSectionsForCourse(ctx context.Context, courseID string) ([]types.Section, error) {
	// fetch the course document first
	dsnap, err := Client.Collection("courses").Doc(courseID).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to find course %s: %v", courseID, err)
	}

	var course types.Course
	if err := dsnap.DataTo(&course); err != nil {
		return nil, fmt.Errorf("failed to parse course data: %v", err)
	}

	// check if there are any sections linked
	if len(course.SectionIDs) == 0 {
		return []types.Section{}, nil
	}

	// batch fetch the sections
	// instead of searching "WHERE course_id == CS110", ask for the specific IDs
	// to avoid scanning the entire sections collection
	// efficient for courses with many sections like mentioned at the top
	docRefs := make([]*firestore.DocumentRef, len(course.SectionIDs))
	for i, secID := range course.SectionIDs {
		docRefs[i] = Client.Collection("sections").Doc(secID)
	}

	// getall retrieves multiple documents in a single network round-trip
	// more efficient than querying one by one
	sectionSnaps, err := Client.GetAll(ctx, docRefs)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sections: %v", err)
	}

	// unmarshal results
	var sections []types.Section
	for _, snap := range sectionSnaps {
		// verify the doc exists
		// in case a section was deleted but ID remains
		if !snap.Exists() {
			continue
		}
		var s types.Section
		if err := snap.DataTo(&s); err == nil {
			sections = append(sections, s)
		}
	}

	return sections, nil
}
