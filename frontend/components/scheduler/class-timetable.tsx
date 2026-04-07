"use client";

import { Section } from "@/lib/classes";
import { ensureMinutes, formatTime, timeStringToMinutes } from "@/lib/utils";
import { timeSlots } from "@/lib/scheduler";

type ClassTimetableProps = {
    schedule: Section[];
};

export default function ClassTimetable({ schedule }: ClassTimetableProps) {
    if (schedule.length === 0) {
        return null;
    }

    return (
        <div className="bg-white border border-ring/30 overflow-hidden rounded-md">
            <div className="grid grid-cols-[70px_repeat(5,1fr)] border-b border-ring/30 bg-muted/50">
                <div className="p-1 border-r border-ring/30 text-xs font-semibold text-muted-foreground text-center">
                    Time
                </div>
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                    <div
                        key={day}
                        className="p-1 border-r last:border-r-0 border-ring/30 text-xs text-muted-foreground text-center"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {timeSlots.map((timeLabel) => {
                const slotStart = timeStringToMinutes(timeLabel);
                const slotEnd = slotStart + 30;

                return (
                    <div
                        key={timeLabel}
                        className="grid grid-cols-[70px_repeat(5,1fr)] border-b last:border-b-0 border-ring/30 min-h-[30px]"
                    >
                        <div className="border-r border-ring/30 text-xs text-muted-foreground flex items-start justify-center pt-1 bg-muted/5">
                            {timeLabel}
                        </div>

                        {[1, 2, 3, 4, 5].map((dayIndex) => {
                            let matchedSection = null;
                            let matchedMeeting = null;
                            let isStart = false;
                            let isEnd = false;

                            for (const section of schedule) {
                                const meeting = section.meetings.find((m) => {
                                    const start = ensureMinutes(m.start_time);
                                    const end = ensureMinutes(m.end_time);

                                    return (
                                        m.day === dayIndex &&
                                        start < slotEnd &&
                                        end > slotStart
                                    );
                                });

                                if (meeting) {
                                    matchedSection = section;
                                    matchedMeeting = meeting;

                                    const start = ensureMinutes(
                                        meeting.start_time,
                                    );
                                    isStart =
                                        start >= slotStart && start < slotEnd;
                                    isEnd =
                                        ensureMinutes(meeting.end_time) >
                                            slotStart &&
                                        ensureMinutes(meeting.end_time) <=
                                            slotEnd;
                                    break;
                                }
                            }

                            return (
                                <div
                                    key={dayIndex}
                                    className="border-r last:border-r-0 border-ring/30 relative"
                                >
                                    {matchedSection && matchedMeeting && (
                                        <div
                                            className={`
                                                w-full h-full text-xs overflow-hidden px-2
                                                ${
                                                    isStart
                                                        ? "rounded-t-md border-t border-x bg-neutral-50 py-1"
                                                        : "border-x bg-neutral-50/50"
                                                }
                                                ${
                                                    ensureMinutes(
                                                        matchedMeeting.end_time,
                                                    ) <= slotEnd
                                                        ? "rounded-b-md border-b"
                                                        : ""
                                                }
                                                border-ring/30
                                            `}
                                        >
                                            {isStart && (
                                                <>
                                                    <div className="font-semibold truncate">
                                                        {
                                                            matchedSection.course_id
                                                        }
                                                    </div>
                                                    <div className="text-[10px] truncate">
                                                        {
                                                            matchedMeeting.location
                                                        }
                                                    </div>
                                                </>
                                            )}
                                            <div className="flex items-end h-full">
                                                {isEnd && (
                                                    <div className="text-[10px] pb-1">
                                                        {formatTime(
                                                            matchedMeeting.start_time,
                                                        )}{" "}
                                                        -{" "}
                                                        {formatTime(
                                                            matchedMeeting.end_time,
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
