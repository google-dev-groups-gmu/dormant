"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import CourseRequestPanel from "@/components/scheduler/plan/course-request-panel";
import ClassTimetable from "@/components/scheduler/class-timetable";
import { Button } from "@/components/ui/button";
import { Schedule, Section } from "@/lib/classes";
import { BACKEND_URL } from "@/lib/constants";
import ClassListTable from "../class-list";

type ScheduleGeneratorPanelProps = {
    userID: string;
};

function dedupeIDs(ids: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
        if (seen.has(id)) {
            continue;
        }
        seen.add(id);
        out.push(id);
    }
    return out;
}

export default function ScheduleGeneratorPanel({
    userID,
}: ScheduleGeneratorPanelProps) {
    const [selectedCourseIDs, setSelectedCourseIDs] = useState<string[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [generating, setGenerating] = useState(false);

    const scheduleSections = useMemo<Section[][]>(() => {
        const out: Section[][] = [];
        for (const schedule of schedules) {
            out.push(schedule.sections || []);
        }
        return out;
    }, [schedules]);

    const addCourse = (courseID: string) => {
        setSelectedCourseIDs((prev) => dedupeIDs([...prev, courseID]));
    };

    const removeCourse = (courseID: string) => {
        setSelectedCourseIDs((prev) => {
            const next: string[] = [];
            for (const id of prev) {
                if (id !== courseID) {
                    next.push(id);
                }
            }
            return next;
        });
    };

    const generate = async () => {
        if (selectedCourseIDs.length === 0 || !userID) {
            toast("Please select at least one class before generating.");
            return;
        }

        setGenerating(true);
        setActiveIndex(0);

        try {
            const payload = {
                user_id: userID,
                course_ids: selectedCourseIDs,
            };

            const res = await fetch(`${BACKEND_URL}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let serverMessage = "Failed to generate schedules.";
                try {
                    const body = await res.json();
                    if (body && typeof body.error === "string" && body.error) {
                        serverMessage = body.error;
                    }
                } catch {
                    // keep default message when response is not JSON
                }
                throw new Error(serverMessage);
            }

            const data: Schedule[] = (await res.json()) || [];
            setSchedules(data);
            setActiveIndex(0);

            if (data.length === 0) {
                toast.info(
                    "No valid schedules were found for the selected classes. Try a different combination.",
                );
            } else {
                toast.success(`Generated ${data.length} possible schedules.`);
            }
        } catch (error) {
            console.error("Generate failed", error);
            setSchedules([]);
            setActiveIndex(0);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Generate failed. Please try again.");
            }
        } finally {
            setGenerating(false);
        }
    };

    const goPrev = () => {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };

    const goNext = () => {
        setActiveIndex((prev) =>
            prev < scheduleSections.length - 1 ? prev + 1 : prev,
        );
    };

    const activeSchedule =
        scheduleSections.length > 0 ? scheduleSections[activeIndex] : [];

    return (
        <div className="h-full grid grid-cols-[1fr_2fr] gap-3">
            <div className="min-w-0 h-full">
                <CourseRequestPanel
                    selectedCourseIDs={selectedCourseIDs}
                    onAddCourse={addCourse}
                    onRemoveCourse={removeCourse}
                    onGenerate={generate}
                    generating={generating}
                />
            </div>

            <div className="flex flex-col min-w-0 gap-3 rounded-md border border-ring/30 bg-white p-3 h-full overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">
                            Generated Timetables
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {scheduleSections.length > 0
                                ? `Schedule ${activeIndex + 1} of ${scheduleSections.length}`
                                : "Generate schedules to preview results."}
                        </p>
                    </div>

                    {scheduleSections.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={goPrev}
                                disabled={activeIndex === 0}
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={goNext}
                                disabled={
                                    activeIndex >= scheduleSections.length - 1
                                }
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col w-full gap-3 overflow-y-auto flex-1 min-h-0">
                    <ClassListTable schedule={activeSchedule} />
                    <ClassTimetable schedule={activeSchedule} />
                </div>
            </div>
        </div>
    );
}
