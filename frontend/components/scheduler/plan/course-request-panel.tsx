"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CourseResult } from "@/lib/classes";
import { BACKEND_URL } from "@/lib/constants";

type CourseRequestPanelProps = {
    selectedCourseIDs: string[];
    onAddCourse: (courseID: string) => void;
    onRemoveCourse: (courseID: string) => void;
    onGenerate: () => void;
    generating: boolean;
};

export default function CourseRequestPanel({
    selectedCourseIDs,
    onAddCourse,
    onRemoveCourse,
    onGenerate,
    generating,
}: CourseRequestPanelProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CourseResult[]>([]);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/search?q=${query}`);
                if (!res.ok) {
                    return;
                }
                const data: CourseResult[] = (await res.json()) || [];
                setResults(data);
            } catch (error) {
                console.error("Failed to search courses", error);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [query]);

    const selectedSet = useMemo(
        () => new Set(selectedCourseIDs),
        [selectedCourseIDs],
    );

    return (
        <div className="flex h-full flex-col gap-3 rounded-md border border-ring/30 bg-white p-3">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                    Required Classes
                </h3>
                <p className="text-xs text-muted-foreground">
                    Search and add courses you must take this semester.
                </p>
            </div>

            <Input
                value={query}
                onChange={(event) => setQuery(event.target.value.toUpperCase())}
                placeholder="Search course (e.g. CS110)"
                className="h-8"
            />

            <div className="max-h-48 overflow-y-auto rounded-md border border-ring/30">
                {results.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                        Type at least 2 characters to search.
                    </p>
                ) : (
                    results.map((course) => {
                        const isAdded = selectedSet.has(course.id);
                        return (
                            <button
                                key={course.id}
                                type="button"
                                className="flex w-full items-center justify-between border-b border-ring/20 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isAdded}
                                onClick={() => onAddCourse(course.id)}
                            >
                                <span className="font-medium">{course.id}</span>
                                <span className="text-xs text-muted-foreground">
                                    {isAdded ? "Added" : course.title}
                                </span>
                            </button>
                        );
                    })
                )}
            </div>

            <div className="rounded-md border border-ring/30 p-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Selected ({selectedCourseIDs.length})
                </p>
                <div className="flex flex-wrap gap-2">
                    {selectedCourseIDs.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                            No courses selected yet.
                        </p>
                    )}
                    {selectedCourseIDs.map((courseID) => (
                        <div
                            key={courseID}
                            className="inline-flex items-center gap-2 rounded-full border border-ring/30 bg-muted/30 px-2 py-1 text-xs"
                        >
                            <span>{courseID}</span>
                            <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => onRemoveCourse(courseID)}
                                aria-label={`Remove ${courseID}`}
                            >
                                x
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <Button
                className="mt-auto"
                size={"sm"}
                variant={"outline"}
                onClick={onGenerate}
                disabled={generating || selectedCourseIDs.length === 0}
            >
                {generating ? "Generating..." : "Generate"}
            </Button>
        </div>
    );
}
