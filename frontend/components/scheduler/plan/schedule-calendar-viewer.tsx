"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section } from "@/lib/classes";

type ScheduleCalendarViewerProps = {
    schedules: Section[][];
    activeIndex: number;
    onPrev: () => void;
    onNext: () => void;
};

type PositionedBlock = {
    day: number;
    rowStart: number;
    rowEnd: number;
    courseID: string;
    sectionID: string;
    location: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const START_MIN = 8 * 60;
const END_MIN = 20 * 60;
const SLOT_MIN = 15;
const TOTAL_ROWS = (END_MIN - START_MIN) / SLOT_MIN;
const BLOCK_COLORS = [
    "bg-sky-100 border-sky-300 text-sky-900",
    "bg-emerald-100 border-emerald-300 text-emerald-900",
    "bg-amber-100 border-amber-300 text-amber-900",
    "bg-rose-100 border-rose-300 text-rose-900",
    "bg-indigo-100 border-indigo-300 text-indigo-900",
    "bg-teal-100 border-teal-300 text-teal-900",
];

function clampMinute(minute: number): number {
    if (minute < START_MIN) {
        return START_MIN;
    }
    if (minute > END_MIN) {
        return END_MIN;
    }
    return minute;
}

function formatHour(minute: number): string {
    const h24 = Math.floor(minute / 60);
    const mins = minute % 60;
    const suffix = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function getHourMarkers(): number[] {
    const markers: number[] = [];
    for (let minute = START_MIN; minute <= END_MIN; minute += 60) {
        markers.push(minute);
    }
    return markers;
}

function buildBlocks(schedule: Section[]): PositionedBlock[] {
    const blocks: PositionedBlock[] = [];

    for (const section of schedule) {
        for (const meeting of section.meetings) {
            if (meeting.day < 1 || meeting.day > 5) {
                continue;
            }

            const start = clampMinute(meeting.start_time);
            const end = clampMinute(meeting.end_time);

            let rowStart = Math.floor((start - START_MIN) / SLOT_MIN) + 1;
            let rowEnd = Math.ceil((end - START_MIN) / SLOT_MIN) + 1;

            if (rowStart < 1) {
                rowStart = 1;
            }
            if (rowEnd > TOTAL_ROWS + 1) {
                rowEnd = TOTAL_ROWS + 1;
            }

            blocks.push({
                day: meeting.day,
                rowStart,
                rowEnd,
                courseID: section.course_id,
                sectionID: section.section,
                location: meeting.location,
            });
        }
    }

    return blocks;
}

export default function ScheduleCalendarViewer({
    schedules,
    activeIndex,
    onPrev,
    onNext,
}: ScheduleCalendarViewerProps) {
    const activeSchedule = schedules.length > 0 ? schedules[activeIndex] : [];
    const blocks = buildBlocks(activeSchedule);
    const hourMarkers = getHourMarkers();

    const courseColor = new Map<string, string>();
    let colorCursor = 0;
    for (const block of blocks) {
        if (!courseColor.has(block.courseID)) {
            courseColor.set(
                block.courseID,
                BLOCK_COLORS[colorCursor % BLOCK_COLORS.length],
            );
            colorCursor += 1;
        }
    }

    return (
        <div className="flex h-full flex-col rounded-md border border-ring/30 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">
                        Generated Timetables
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {schedules.length === 0
                            ? "Generate schedules to preview options."
                            : `Schedule ${activeIndex + 1} of ${schedules.length}`}
                    </p>
                </div>

                {schedules.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={onPrev}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={onNext}
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto">
                <div className="grid min-w-[760px] grid-cols-[72px_repeat(5,minmax(120px,1fr))] rounded-md border border-ring/30">
                    <div className="border-b border-r border-ring/30 bg-muted/30 p-2 text-center text-xs text-muted-foreground">
                        Time
                    </div>
                    {DAYS.map((day) => (
                        <div
                            key={day}
                            className="border-b border-r border-ring/30 bg-muted/30 p-2 text-center text-xs font-semibold text-muted-foreground last:border-r-0"
                        >
                            {day}
                        </div>
                    ))}

                    <div
                        className="relative border-r border-ring/30"
                        style={{ gridRow: "2", height: `${TOTAL_ROWS * 18}px` }}
                    >
                        {hourMarkers.map((minute) => {
                            const topPx =
                                ((minute - START_MIN) / SLOT_MIN) * 18;
                            return (
                                <div
                                    key={minute}
                                    className="absolute left-0 right-0 -translate-y-1/2 px-2 text-[11px] text-muted-foreground"
                                    style={{ top: `${topPx}px` }}
                                >
                                    {formatHour(minute)}
                                </div>
                            );
                        })}
                    </div>

                    {[1, 2, 3, 4, 5].map((dayNum) => (
                        <div
                            key={dayNum}
                            className="relative border-r border-ring/30 last:border-r-0"
                            style={{
                                gridRow: "2",
                                height: `${TOTAL_ROWS * 18}px`,
                                display: "grid",
                                gridTemplateRows: `repeat(${TOTAL_ROWS}, minmax(0, 1fr))`,
                            }}
                        >
                            {schedules.length === 0 &&
                                hourMarkers.map((minute) => {
                                    const topPx =
                                        ((minute - START_MIN) / SLOT_MIN) * 18;
                                    return (
                                        <div
                                            key={`${dayNum}-${minute}`}
                                            className="absolute left-0 right-0 border-t border-dashed border-ring/20"
                                            style={{ top: `${topPx}px` }}
                                        />
                                    );
                                })}

                            {blocks.map((block, idx) => {
                                if (block.day !== dayNum) {
                                    return null;
                                }

                                const color =
                                    courseColor.get(block.courseID) ||
                                    "bg-slate-100 border-slate-300 text-slate-900";

                                return (
                                    <div
                                        key={`${block.courseID}-${block.sectionID}-${dayNum}-${idx}`}
                                        className={`m-0.5 rounded-md border px-2 py-1 text-[11px] shadow-sm ${color}`}
                                        style={{
                                            gridRow: `${block.rowStart} / ${block.rowEnd}`,
                                        }}
                                    >
                                        <p className="truncate font-semibold">
                                            {block.courseID}
                                        </p>
                                        <p className="truncate text-[10px]">
                                            Section {block.sectionID}
                                        </p>
                                        <p className="truncate text-[10px] opacity-80">
                                            {block.location}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
