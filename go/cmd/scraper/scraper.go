package main

// scraper for GMU courses
// performs guest handshake to get session cookie + synchronizer token
// then fetches course data for a given subject and term
// outputs the raw JSON response to stdout
//

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/firestore"
	"github.com/Google-Developer-Groups-GMU/dormant/go/internal/types"
	"github.com/joho/godotenv"
)

const (
	BaseURL = "https://ssbstureg.gmu.edu/StudentRegistrationSsb"
	Term    = "202610" // spring 2026 term
)

func main() {
	// initialize HTTP client with cookie jar
	// NOTE: handles JSESSIONID automatically
	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Jar:     jar,
		Timeout: 15 * time.Second,
	}

	// initialize firestore
	// NOTE: this is not an API endpoint, so we init firebase here
	err := godotenv.Load()
	if err != nil {
		log.Fatal(".env file failed to load")
	}

	if err := firestore.Init(); err != nil {
		log.Fatalf("Failed to initialize Firestore: %v", err)
	}
	defer firestore.Close()

	// guest handshake to get X-Synchronizer-Token
	fmt.Println("== 1 == visiting Search Page to get Token...")

	// visit the main page just to parse the token from the HTML
	targetURL := BaseURL + "/ssb/classSearch/classSearch"

	req, _ := http.NewRequest("GET", targetURL, nil)
	setHeaders(req, "")

	resp, err := client.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	bodyString := string(bodyBytes)

	if resp.StatusCode != 200 {
		log.Fatalf("Server returned %d", resp.StatusCode)
	}

	// regex to find window.synchronizerToken
	re := regexp.MustCompile(`name="synchronizerToken"\s+content="([^"]+)"`)
	matches := re.FindStringSubmatch(bodyString)

	if len(matches) < 2 {
		// dumping HTML page for debugging
		os.WriteFile("debug_page.html", bodyBytes, 0644)
		log.Fatal("Could not find X-Synchronizer-Token in HTML.")
	}
	token := matches[1]
	fmt.Printf("   > Token Found: %s\n", token)

	// setting the term
	// all requests will happen after setting the term
	fmt.Println("== 2 == setting term to", Term, "...")

	formData := url.Values{}
	formData.Set("term", Term)
	formData.Set("studyPath", "")
	formData.Set("studyPathText", "")
	formData.Set("startDatepicker", "")
	formData.Set("endDatepicker", "")

	// NOTE: use the "uniqueSessionId" just to be safe
	uniqueID := fmt.Sprintf("guest%d", time.Now().Unix())
	termUrl := fmt.Sprintf("%s/ssb/term/search?mode=search&uniqueSessionId=%s", BaseURL, uniqueID)

	req, _ = http.NewRequest("POST", termUrl, strings.NewReader(formData.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// attach the token header
	setHeaders(req, token)

	resp, err = client.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	resp.Body.Close()

	// search for classes
	// use this to get all subjects in prod
	subjects, err := GetSubjects(client, token)
	if err != nil {
		log.Fatal(err)
	}

	// in local we are only testing CS and MATH
	// var subjects = []string{"CS", "MATH"}
	fmt.Printf("== 3 == fetching classes for %s...\n", subjects)

	// for concurrency
	var wg sync.WaitGroup

	// caching to avoid writing the same course metadata million times
	var courseMu sync.Mutex
	// using a set to track seen courses
	seenCourses := make(map[string]bool)

	for _, subj := range subjects {
		// NOTE: banner api is stateful. which means we need to reset the search
		// every time we change the subject
		// otherwise it will keep appending to the previous search
		resetSearch(client, token)

		offset := 0
		maxSize := 50

		for {
			fmt.Printf("fetching %s (offset %d)...\n", subj, offset)

			// build URL with dynamic offset
			apiURL := fmt.Sprintf(
				"%s/ssb/searchResults/searchResults?txt_subject=%s&txt_term=%s&pageOffset=%d&pageMaxSize=%d",
				BaseURL, subj, Term, offset, maxSize,
			)

			// fetch
			req, _ = http.NewRequest("GET", apiURL, nil)
			// attach the token header
			setHeaders(req, token)

			resp, err = client.Do(req)
			if err != nil {
				log.Fatal(err)
			}
			defer resp.Body.Close()

			bodyBytes, _ = io.ReadAll(resp.Body)

			if resp.StatusCode != 200 {
				log.Fatalf("error %d: %s", resp.StatusCode, string(bodyBytes))
			}

			fmt.Printf("received %d bytes of JSON.\n", len(bodyBytes))
			fmt.Println(string(bodyBytes[:1000]))

			// unmarshal into struct
			var response types.BannerResponse
			json.Unmarshal(bodyBytes, &response)

			if len(response.Data) == 0 {
				break
			}

			// process and save
			for _, rawSec := range response.Data {

				// NOTE: we save course and section data separately
				// in different root collection in firestore.
				// this is to avoid data being 1mb< and hitting firebase document limit
				// also it allows us to use lazy loading for courses
				// fetch courses -> fetch sections on demand

				// + why not subcollection?
				// query limitation. to use collection group queries,
				// we cannot have subcollections:
				// fs.Get("10492") is logically sound than fs.Get("courses/CS110/sections/10492")
				// when we want extra search features later
				// "give me all sections taught by prof goof" for example.

				// save course info if not seen before
				// do this synchronously to ensure we don't spam firestore with
				// the same course title over and over
				courseID := rawSec.Subject + rawSec.CourseNumber
				courseMu.Lock()
				if !seenCourses[courseID] {
					seenCourses[courseID] = true

					// course object
					course := types.Course{
						ID:         courseID,
						Department: rawSec.Subject,
						Code:       rawSec.CourseNumber,
						Title:      rawSec.Title,
					}

					go func(c types.Course) {
						if err := firestore.SaveCourse(context.Background(), c); err != nil {
							log.Printf("Error saving course %s: %v", c.ID, err)
						}
					}(course)
				}
				courseMu.Unlock()

				// save section data
				wg.Add(1)
				go func(raw types.BannerSection) {
					defer wg.Done()

					cleanSec := parseBannerSection(raw)

					// save to firestore
					if err := firestore.SaveSection(context.Background(), cleanSec); err != nil {
						log.Printf("Error saving section %s: %v", cleanSec.ID, err)
					} else {
						fmt.Printf("   > Saved %s-%s (%s)\n", cleanSec.CourseID, cleanSec.Section, cleanSec.ID)
					}
				}(rawSec)
			}

			// pagination: increment offset
			offset += maxSize
			if offset >= response.TotalCount {
				break
			}

			// no classes found, skip to next subject
			if response.TotalCount == 0 {
				fmt.Printf("   > No classes found for %s. Skipping.\n", subj)
				break
			}

			// this is just to be polite
			// and not get rate limited by the server lol
			time.Sleep(500 * time.Millisecond)
		}
		fmt.Printf("sleeping 2s before next subject\n")
		time.Sleep(2 * time.Second)
	}
	// wait for all goroutines to finish
	wg.Wait()
	fmt.Println("== DONE == all subjects processed.")
}

// clears the search criteria in the session
func resetSearch(client *http.Client, token string) {
	resetURL := fmt.Sprintf("%s/ssb/classSearch/resetDataForm", BaseURL)
	req, _ := http.NewRequest("POST", resetURL, nil)
	setHeaders(req, token)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Warning: Failed to reset search: %v", err)
	} else {
		resp.Body.Close()
	}
}

// set the headers
func setHeaders(req *http.Request, token string) {
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/javascript, */*; q=0.01")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")

	if token != "" {
		req.Header.Set("X-Synchronizer-Token", token)
	}
}

// parsing time: 1330 -> 13 + 30
// return 0 if nil or invalid
func parseTimeStr(t *string) int {
	if t == nil {
		return 0
	}
	val := *t
	if len(val) < 4 {
		return 0
	}
	// "1330" -> 13, 30
	hh, _ := strconv.Atoi(val[:2])
	mm, _ := strconv.Atoi(val[2:])
	return (hh * 60) + mm
}

// safely dereference string pointer
func getStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// parse into section type
func parseBannerSection(raw types.BannerSection) types.Section {
	sec := types.Section{
		ID:       raw.CRN,                        // CRN as the unique ID
		CourseID: raw.Subject + raw.CourseNumber, // ex) CS100
		Section:  raw.SequenceNumber,
		// first professor if available
		Professor: "TBA",
	}

	if len(raw.Faculty) > 0 {
		sec.Professor = raw.Faculty[0].DisplayName
	}

	// parse meetings
	for _, mf := range raw.MeetingsFaculty {
		mt := mf.MeetingTime

		if mt.BeginTime == nil || mt.EndTime == nil {
			continue
		}

		// converting 1000 -> 600 minutes
		startMin := parseTimeStr(mt.BeginTime)
		endMin := parseTimeStr(mt.EndTime)

		// handle potential null location
		loc := getStr(mt.Building) + " " + getStr(mt.Room)
		if strings.TrimSpace(loc) == "" {
			loc = "Online / TBA"
		}

		// banner stores days as booleans
		// need to create a meeting for EACH true day
		daysMap := map[int]bool{
			0: mt.Sunday, 1: mt.Monday, 2: mt.Tuesday,
			3: mt.Wednesday, 4: mt.Thursday, 5: mt.Friday, 6: mt.Saturday,
		}

		for dayCode, isActive := range daysMap {
			if isActive {
				sec.Meetings = append(sec.Meetings, types.Meeting{
					Day:       dayCode,
					StartTime: startMin,
					EndTime:   endMin,
					Location:  loc,
				})
			}
		}
	}
	return sec
}

// fetch all subjects from banner
func GetSubjects(client *http.Client, token string) ([]string, error) {
	fmt.Println("== 0 == Fetching Subject List...")

	// fetch all subjects (max=500 should cover it)
	apiURL := fmt.Sprintf(
		"%s/ssb/classSearch/get_subject?searchTerm=&term=%s&offset=1&max=500",
		BaseURL, Term,
	)

	req, _ := http.NewRequest("GET", apiURL, nil)
	setHeaders(req, token)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var subjects []types.BannerSubject
	if err := json.Unmarshal(body, &subjects); err != nil {
		return nil, err
	}

	var codes []string
	for _, s := range subjects {
		codes = append(codes, s.Code)
	}

	fmt.Printf("   > Found %d active subjects.\n", len(codes))
	return codes, nil
}
