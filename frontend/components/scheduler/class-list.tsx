"use client";

import { Trash2 } from "lucide-react";

import * as Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Section } from "@/lib/classes";
import { dayMap, formatTime } from "@/lib/utils";

type ClassListTableProps = {
    schedule: Section[];
    onUpdate?: (sections: Section[]) => void;
};

export default function ClassListTable({
    schedule,
    onUpdate,
}: ClassListTableProps) {
    const isEditable = typeof onUpdate === "function";

    const handleRemove = (id: string) => {
        if (onUpdate) {
            onUpdate(schedule.filter((s) => s.id !== id));
        }
    };

    return (
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
                                        onClick={() => handleRemove(section.id)}
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
    );
}
