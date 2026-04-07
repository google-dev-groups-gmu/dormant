package api

// handlers for API routes
// 1. users current semester schedule saving and fetching
// 2. schedule generation, saving schedules, etc.
// this is about dealing with ALREADY GENERATED schedules
// (user should be able to have multiple saved possible schedules)
// (like plan A, plan B, ...)
// not generating schedules from scratch
// that is done in the scheduler module

import (
	"net/http"

	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/firestore"
	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/scheduler"
	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/types"
	"github.com/gin-gonic/gin"
)

//
// --- current schedule related handlers ---

// save schedule
func SaveCurrentSchedule(c *gin.Context) {
	// /users/{userID}/schedules
	userID := c.Param("userID")

	var schedule types.Schedule
	if err := c.BindJSON(&schedule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	err := firestore.SaveUserSchedule(c.Request.Context(), userID, schedule)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "saved", "id": schedule.ID})
}

// get saved schedules
func GetSavedCurrentSchedules(c *gin.Context) {
	userID := c.Param("userID")

	schedules, err := firestore.GetUserSchedules(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, schedules)
}

//
// --- schedule generation related handlers ---

// POST /api/generate
// input: { "courseIds": ["CS101", "MATH200"] }
// input should be course IDs not CRN because we want to generate all possible sections
// output: Returns the generated schedules (and saves them to DB)
func GenerateSchedule(c *gin.Context) {
	var req types.GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	// validate input with max courses limit of 7
	// maybe we can change this into credit limit later
	if len(req.CourseIDs) > 7 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Too many courses selected"})
		return
	}

	// make sure we deduplicate and clean IDs before sending to scheduler
	uniqueCourses := make([]string, 0, len(req.CourseIDs))
	seen := make(map[string]bool)
	for _, cid := range req.CourseIDs {
		// simple normalization here; the scheduler re-normalizes internally too
		// but this guarantees unique IDs at the entrypoint
		if !seen[cid] {
			seen[cid] = true
			uniqueCourses = append(uniqueCourses, cid)
		}
	}

	// 1. fetch section data from firestore
	// 2. run backtracking algorithm to generate valid schedules
	// 3. save results to schedules collection
	generatedSchedules, err := scheduler.Run(c.Request.Context(), uniqueCourses, req.UserID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// return results immediately so frontend can display them
	c.JSON(http.StatusOK, generatedSchedules)
}

// save generated schedule
func SaveGeneratedSchedule(c *gin.Context) {
	// TODO: implement saving generated schedule to Firestore
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}

// get saved generated schedules
func GetSavedGeneratedSchedules(c *gin.Context) {
	// TODO: implement fetching saved generated schedules from Firestore
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}

// delete saved schedule
func DeleteGeneratedSchedule(c *gin.Context) {
	// TODO: implement deleting saved schedule from Firestore
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}

// update saved schedule
func UpdateGeneratedSchedule(c *gin.Context) {
	// TODO: implement updating saved schedule in Firestore
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}
