"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/utils";

import gdg_logo from "@/public/logo.png";

import { Spinner } from "@/components/ui/spinner";
import ClassList from "@/components/scheduler/add-class";
import ClassListTable from "@/components/scheduler/class-list";
import ClassTimetable from "@/components/scheduler/class-timetable";
import ScheduleGeneratorPanel from "@/components/scheduler/plan/schedule-generator-panel";
import { BACKEND_URL } from "@/lib/constants";
import { Section } from "@/lib/classes";

export default function SchedulerPage() {
    const router = useRouter();

    // NOTE: loading is true while we check auth status
    // isLoading is true while we fetch schedule data
    // i know confusing names lol but whatever i'll fix later
    const { user, loading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [currentSchedule, setCurrentSchedule] = useState<Section[]>([]);
    const [activeTab, setActiveTab] = useState("Current");

    // shared handler to update schedule from child components
    const handleScheduleUpdate = async (newSchedule: Section[]) => {
        // optimistic update so UI feels snappy
        setCurrentSchedule(newSchedule);

        if (!user || !user.UserID) return;

        const payload = {
            id: "current",
            userId: user.UserID,
            name: "Current Semester",
            sections: newSchedule,
        };

        try {
            const res = await fetch(
                `${BACKEND_URL}/api/users/${user.UserID}/schedules`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );
            if (!res.ok) throw new Error("Failed to save");
            console.log("Auto-saved to Firestore");
        } catch (error) {
            console.error("Auto-save failed:", error);
        }
    };

    useEffect(() => {
        if (!user || !user.UserID) return;

        const loadSchedule = async () => {
            try {
                // fetch users schedules
                const res = await fetch(
                    `${BACKEND_URL}/api/users/${user.UserID}/schedules`,
                );
                if (res.ok) {
                    const data = await res.json();
                    console.log("Loaded schedules:", data);
                    // if they have a saved schedule, load the sections from the first one
                    if (data && data.length > 0) {
                        setCurrentSchedule(data[0].sections);
                    }
                }
            } catch (err) {
                console.error("Failed to load schedule", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadSchedule();
    }, [user]);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if (loading || !user || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Spinner />
            </div>
        );
    } else {
        return (
            <div className="min-h-screen bg-background pt-4 flex flex-col">
                <div className="flex-1 relative bg-white shadow-md border border-ring/30 overflow-hidden mx-4 flex flex-col">
                    <div className="flex items-center justify-between p-3 px-6 border-b border-ring/30">
                        <div
                            className="text-muted-foreground font-serif font-normal text-lg flex items-center hover:cursor-pointer"
                            onClick={() => (window.location.href = "/")}
                        >
                            <Image
                                src={gdg_logo}
                                alt="GDG Logo"
                                width={20}
                                height={20}
                                className="inline-block mr-2 w-6 h-auto"
                            />
                            dormant.
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            {user.Email}
                            <div className="w-8 h-8 bg-muted-foreground rounded-full">
                                <Image
                                    src={user.AvatarURL}
                                    alt="User Avatar"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        <nav className="w-48 bg-[var(--background-muted)]/30 border-r border-ring/30 p-4 space-y-2">
                            <div className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-3 border-b pb-2">
                                Navigation
                            </div>
                            {["Current", "Plan"].map((item) => (
                                <div
                                    key={item}
                                    onClick={() => setActiveTab(item)}
                                    className={`text-sm cursor-pointer my-1 pt-2 transition-colors ${
                                        activeTab === item
                                            ? "bg-muted/50 text-foreground font-medium border-b w-fit border-foreground"
                                            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/30"
                                    }`}
                                >
                                    {item}
                                </div>
                            ))}
                        </nav>

                        <div className="flex-1 p-3 space-y-3">
                            {activeTab === "Current" ? (
                                <>
                                    <ClassList
                                        schedule={currentSchedule}
                                        onUpdate={handleScheduleUpdate}
                                    />

                                    <div className="flex-1 flex flex-col xl:grid xl:grid-cols-2 gap-3">
                                        <ClassListTable
                                            schedule={currentSchedule}
                                            onUpdate={handleScheduleUpdate}
                                        />
                                        <ClassTimetable
                                            schedule={currentSchedule}
                                        />
                                    </div>
                                </>
                            ) : (
                                <ScheduleGeneratorPanel userID={user.UserID} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
