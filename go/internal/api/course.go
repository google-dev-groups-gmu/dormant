package api

import (
	"net/http"

	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/firestore"
	"github.com/gin-gonic/gin"
)

// GET /api/search?q=CS110
func HandleSearchCourses(c *gin.Context) {
	query := c.Query("q")

	// only search if query length >= 2
	if len(query) < 2 {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	results, err := firestore.SearchCourses(c.Request.Context(), query, 20)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

func HandleGetSections(c *gin.Context) {
	// get courseID from query parameter
	// /api/sections?courseID=CS110
	courseID := c.Query("courseID")

	if courseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "courseID is required"})
		return
	}

	// pass the context from gin to firestore
	sections, err := firestore.GetSectionsForCourse(c.Request.Context(), courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sections)
}
