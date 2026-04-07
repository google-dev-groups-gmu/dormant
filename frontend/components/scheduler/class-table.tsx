"use client";

// ui components
import { Trash2 } from "lucide-react";
import * as Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// util
import {
    dayMap,
    formatTime,
    timeStringToMinutes,
    ensureMinutes,
} from "@/lib/utils";
import { ClassTableProps, timeSlots } from "@/lib/scheduler";

export default function ClassTable({ schedule, onUpdate }: ClassTableProps) {
    const isEditable = typeof onUpdate === "function";

    // handler for removing class by id
    // this component is not very smart and doesnt manage its own state
    // so we call onUpdate with the new schedule
    // it creates a new array without the removed section (target id) and passes it to onUpdate in parent
    const handleRemove = (id: string) => {
        // update schedule by filtering out the removed section
        if (onUpdate) {
            onUpdate(schedule.filter((s) => s.id !== id));
        }
    };

    return (
        <div className="flex-1 flex flex-col xl:grid xl:grid-cols-2 gap-3">
            <div className="bg-white border border-ring/30 overflow-hidden rounded-md">
                <Table.Table>
                    <Table.TableHeader>
                        <Table.TableRow className="bg-muted/50 hover:bg-muted/50">
                            <Table.TableHead>Class</Table.TableHead>
                            <Table.TableHead>Section</Table.TableHead>
                            <Table.TableHead>Professor</Table.TableHead>
                            <Table.TableHead>Dates</Table.TableHead>
                            <Table.TableHead>Location</Table.TableHead>
                            {isEditable && (
                                <Table.TableHead className="w-[50px]"></Table.TableHead>
                            )}
                        </Table.TableRow>
                    </Table.TableHeader>
                    <Table.TableBody>
                        {schedule.length === 0 && (
                            <Table.TableRow>
                                <Table.TableCell
                                    colSpan={isEditable ? 6 : 5}
                                    className="text-center h-24 text-muted-foreground"
                                >
                                    No classes added.
                                </Table.TableCell>
                            </Table.TableRow>
                        )}
                        {schedule.map((section) => (
                            <Table.TableRow key={section.id}>
                                <Table.TableCell>
                                    <span>{section.course_id}</span>
                                </Table.TableCell>
                                <Table.TableCell>
                                    <span className="px-2 py-0.5 rounded-md text-xs bg-muted/50 text-foreground border border-ring/30">
                                        {section.section}
                                    </span>
                                </Table.TableCell>
                                <Table.TableCell className="text-muted-foreground">
                                    {section.professor}
                                </Table.TableCell>
                                <Table.TableCell>
                                    <div className="flex flex-col">
                                        {section.meetings.map((m, idx) => (
                                            <div
                                                key={idx}
                                                className="text-xs text-muted-foreground flex items-center"
                                            >
                                                <span className="text-foreground w-8">
                                                    {dayMap[m.day]}
                                                </span>
                                                <span>
                                                    {formatTime(m.start_time)} -{" "}
                                                    {formatTime(m.end_time)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Table.TableCell>
                                <Table.TableCell>
                                    <div className="flex flex-col">
                                        {section.meetings.map((m, idx) => (
                                            <div
                                                key={idx}
                                                className="text-xs text-muted-foreground flex items-center"
                                            >
                                                <span className="text-foreground w-8">
                                                    {m.location}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Table.TableCell>
                                {isEditable && (
                                    <Table.TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:cursor-pointer"
                                            onClick={() =>
                                                handleRemove(section.id)
                                            }
                                        >
                                            <Trash2 strokeWidth={1.5} />
                                        </Button>
                                    </Table.TableCell>
                                )}
                            </Table.TableRow>
                        ))}
                    </Table.TableBody>
                </Table.Table>
            </div>

            {schedule.length > 0 && (
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
                        // time slot iteration logic
                        // iterate through 30 min chunks
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

                                {/* iterate through days of the week */}
                                {[1, 2, 3, 4, 5].map((dayIndex) => {
                                    let matchedSection = null;
                                    let matchedMeeting = null;
                                    let isStart = false;
                                    let isEnd = false;

                                    // overlap check
                                    // check every section in schedule to see if it has a meeting that overlaps with this time slot
                                    for (const section of schedule) {
                                        const meeting = section.meetings.find(
                                            (m) => {
                                                const start = ensureMinutes(
                                                    m.start_time,
                                                );
                                                const end = ensureMinutes(
                                                    m.end_time,
                                                );

                                                // IMPORTANT: standard overlap check
                                                // some class is in this slot if:
                                                // its on the same day AND
                                                // its start time is before slot end AND
                                                // its end time is after slot start
                                                return (
                                                    m.day === dayIndex &&
                                                    start < slotEnd &&
                                                    end > slotStart
                                                );
                                            },
                                        );

                                        if (meeting) {
                                            matchedSection = section;
                                            matchedMeeting = meeting;

                                            // we need to know if this slot is the start of the meeting
                                            // so we can style it differently
                                            const start = ensureMinutes(
                                                meeting.start_time,
                                            );
                                            isStart =
                                                start >= slotStart &&
                                                start < slotEnd;
                                            isEnd =
                                                ensureMinutes(
                                                    meeting.end_time,
                                                ) > slotStart &&
                                                ensureMinutes(
                                                    meeting.end_time,
                                                ) <= slotEnd;
                                            break;
                                        }
                                    }

                                    return (
                                        <div
                                            key={dayIndex}
                                            className="border-r last:border-r-0 border-ring/30 relative"
                                        >
                                            {matchedSection &&
                                                matchedMeeting && (
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
            )}
        </div>
    );
}
