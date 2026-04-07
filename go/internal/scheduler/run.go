package scheduler

// resourc heavy computation module
// backtracking algorithm to generate valid class schedules
// given selected courses and their sections

// this is where we generate schedules from scratch
// and feed it to user so they can pick and choose

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/firestore"
	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/types"
)

const maxGeneratedSchedules = 50

func Run(ctx context.Context, courseIDs []string, userID string) ([]types.Schedule, error) {
	if len(courseIDs) == 0 {
		return []types.Schedule{}, nil
	}

	// 1. fetch the specific sections for the courses the user selected
	sections, err := GetSectionsByCourseIDs(ctx, courseIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sections: %w", err)
	}

	// 2. prepare group sections by CourseID so the algorithm can pick one from each bucket
	courseBuckets := make(map[string][]types.Section)
	requestedByNormalized := make(map[string]string, len(courseIDs))
	for _, courseID := range courseIDs {
		requestedByNormalized[normalizeCourseID(courseID)] = courseID
	}

	for _, section := range sections {
		normalized := normalizeCourseID(section.CourseID)
		if requestedID, ok := requestedByNormalized[normalized]; ok {
			// Always bucket under requested IDs so assignment variables/domains align.
			courseBuckets[requestedID] = append(courseBuckets[requestedID], section)
		}
	}

	// enforce one variable per requested course; fail fast if any course has no sections.
	missingCourses := make([]string, 0)
	for _, courseID := range courseIDs {
		if len(courseBuckets[courseID]) == 0 {
			missingCourses = append(missingCourses, courseID)
		}
	}
	if len(missingCourses) > 0 {
		return []types.Schedule{}, fmt.Errorf("no sections found for requested courses: %v", missingCourses)
	}

	orderedCourseIDs := sortByMRV(courseIDs, courseBuckets)

	// 3. CALCULATE: run the backtracking algorithm
	generatedSchedules := generatePermutations(orderedCourseIDs, courseBuckets, userID)

	// 4. SAVE: save generated schedules to Firestore

	// saveSchedules(ctx, userID, generatedSchedules)

	return generatedSchedules, nil
}

// fetches detailed meeting times (Mon/Wed 10am)
// crucial for generating permutations and checking conflicts
func GetSectionsByCourseIDs(ctx context.Context, courseIDs []string) ([]types.Section, error) {
	sections := make([]types.Section, 0)
	for _, courseID := range courseIDs {
		courseSections, err := firestore.GetSectionsForCourse(ctx, courseID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch sections for course %s: %w", courseID, err)
		}
		sections = append(sections, courseSections...)
	}

	return sections, nil
}

// generatePermutations builds conflict-free schedules via DFS backtracking.
func generatePermutations(courseIDs []string, courses map[string][]types.Section, userID string) []types.Schedule {
	var results []types.Schedule
	assignment := make(map[string]types.Section, len(courseIDs))

	var backtrack func(domains map[string][]types.Section)
	backtrack = func(domains map[string][]types.Section) {
		if len(results) >= maxGeneratedSchedules {
			return
		}

		if len(assignment) == len(courseIDs) {
			sections := make([]types.Section, 0, len(courseIDs))
			for _, courseID := range courseIDs {
				sections = append(sections, assignment[courseID])
			}

			idx := len(results) + 1
			results = append(results, types.Schedule{
				ID:       fmt.Sprintf("generated-%d", idx),
				UserID:   userID,
				Name:     fmt.Sprintf("Plan %d", idx),
				Sections: sections,
			})
			return
		}

		courseID := pickUnassignedMRV(courseIDs, assignment, domains)
		if courseID == "" {
			return
		}

		for _, candidate := range domains[courseID] {
			if !isSectionCompatible(candidate, assignment) {
				continue
			}

			assignment[courseID] = candidate

			nextDomains, ok := forwardCheck(courseID, candidate, courseIDs, assignment, domains)
			if ok {
				backtrack(nextDomains)
			}

			delete(assignment, courseID)
		}
	}

	backtrack(cloneDomains(courses))

	return results
}

// time complexity worst case: O(d^n * n^2), where n=requested courses and d=avg sections/course.
// MRV + forward checking prune many invalid branches in practical workloads.

func sortByMRV(courseIDs []string, courseBuckets map[string][]types.Section) []string {
	ordered := append([]string(nil), courseIDs...)
	sort.Slice(ordered, func(i, j int) bool {
		left := len(courseBuckets[ordered[i]])
		right := len(courseBuckets[ordered[j]])
		if left == right {
			return ordered[i] < ordered[j]
		}
		return left < right
	})
	return ordered
}

func pickUnassignedMRV(courseIDs []string, assignment map[string]types.Section, domains map[string][]types.Section) string {
	bestID := ""
	bestSize := int(^uint(0) >> 1)

	for _, courseID := range courseIDs {
		if _, assigned := assignment[courseID]; assigned {
			continue
		}

		size := len(domains[courseID])
		if size < bestSize {
			bestSize = size
			bestID = courseID
		}
	}

	return bestID
}

func forwardCheck(
	assignedCourseID string,
	assignedSection types.Section,
	courseIDs []string,
	assignment map[string]types.Section,
	domains map[string][]types.Section,
) (map[string][]types.Section, bool) {
	// Deep clone the domains to modify for this specific branch
	next := cloneDomains(domains)

	for _, courseID := range courseIDs {
		// skip the one we just assigned and anything already assigned
		if _, done := assignment[courseID]; done || courseID == assignedCourseID {
			continue
		}

		filtered := make([]types.Section, 0, len(next[courseID]))
		for _, section := range next[courseID] {
			// keep it ONLY if it DOES NOT overlap
			if !sectionsOverlap(assignedSection, section) {
				filtered = append(filtered, section)
			}
		}

		// if a course has zero valid sections remaining, this path is a dead end
		if len(filtered) == 0 {
			return nil, false
		}

		next[courseID] = filtered
	}

	return next, true
}

func cloneDomains(domains map[string][]types.Section) map[string][]types.Section {
	copyMap := make(map[string][]types.Section, len(domains))
	for courseID, sections := range domains {
		copyMap[courseID] = append([]types.Section(nil), sections...)
	}
	return copyMap
}

func isSectionCompatible(candidate types.Section, assignment map[string]types.Section) bool {
	for _, assigned := range assignment {
		if sectionsOverlap(candidate, assigned) {
			return false
		}
	}
	return true
}

func sectionsOverlap(a, b types.Section) bool {
	for _, am := range a.Meetings {
		for _, bm := range b.Meetings {
			// same day
			if am.Day == bm.Day {
				// check overlap exclusively (one starts before another ends)
				if am.StartTime < bm.EndTime && bm.StartTime < am.EndTime {
					return true // overlap detected
				}
			}
		}
	}
	return false // no overlap
}

func normalizeCourseID(courseID string) string {
	normalized := strings.ToUpper(strings.TrimSpace(courseID))
	normalized = strings.ReplaceAll(normalized, " ", "")
	normalized = strings.ReplaceAll(normalized, "-", "")
	return normalized
}
