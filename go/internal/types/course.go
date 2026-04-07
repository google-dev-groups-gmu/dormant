package types

type Course struct {
	ID          string `json:"id" firestore:"id"`
	Department  string `json:"department" firestore:"department"` // "CS"
	Code        string `json:"code" firestore:"code"`             // "110"
	Title       string `json:"title" firestore:"title"`           // "Intro to CS"
	Description string `json:"description" firestore:"description"`
	Credits     int    `json:"credits" firestore:"credits"` // 3

	// list of section IDs for this course
	SectionIDs []string `json:"section_ids" firestore:"section_ids"`
	// list of lab section IDs for this course
	LabSectionIDs []string `json:"lab_section_ids" firestore:"lab_section_ids"`
}

type Section struct {
	ID        string `json:"id" firestore:"id"`               // CRN as the ID ex) "10492"
	CourseID  string `json:"course_id" firestore:"course_id"` // "CS110"
	Section   string `json:"section" firestore:"section"`     // "001"
	Professor string `json:"professor" firestore:"professor"`
	IsLab     bool   `json:"is_lab" firestore:"is_lab"`
	IsOnline  bool   `json:"is_online" firestore:"is_online"`
	// section_type comes from Banner schedule type (lecture, lab, recitation, etc.)
	SectionType string `json:"section_type" firestore:"section_type"`

	// backend data for algorithm
	Meetings []Meeting `json:"meetings" firestore:"meetings"`
}

type Meeting struct {
	Day       int    `json:"day" firestore:"day"`               // 0=Sun, 1=Mon, ..., 6=Sat
	StartTime int    `json:"start_time" firestore:"start_time"` // minutes from midnight ex) 600
	EndTime   int    `json:"end_time" firestore:"end_time"`     // same as above ex) 660
	Location  string `json:"location" firestore:"location"`
}

type Schedule struct {
	ID       string    `json:"id" firestore:"id"`
	UserID   string    `json:"user_id" firestore:"user_id"`
	Name     string    `json:"name" firestore:"name"`
	Sections []Section `json:"sections" firestore:"sections"`
}
