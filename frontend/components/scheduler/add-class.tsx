"use client";

import { useState, useEffect } from "react";

// ui components
import * as Dialog from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// util
import { CourseResult, Section } from "@/lib/classes";
import { BACKEND_URL } from "@/lib/constants";
import { ClassListProps } from "@/lib/scheduler";

export default function ClassList({ schedule, onUpdate }: ClassListProps) {
    // state for managing the add class form
    const [showForm, setShowForm] = useState(false);
    // state for managing search and selection
    const [searchQuery, setSearchQuery] = useState("");
    // search results fetched from backend
    const [searchResults, setSearchResults] = useState<CourseResult[]>([]);
    // selected course and section
    const [selectedCourse, setSelectedCourse] = useState<CourseResult | null>(
        null
    );
    // sections available for the selected course
    const [availableSections, setAvailableSections] = useState<Section[]>([]);
    // selected section to add
    const [selectedSection, setSelectedSection] = useState<Section | null>(
        null
    );

    useEffect(() => {
        // if search query is less than 2 chars, clear results
        // we only search for 2+ chars like indicated in the go
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        // avoid refetching if the selected course matches the search query
        // for efficiency
        if (selectedCourse && searchQuery === selectedCourse.id) return;

        // fetch search results from backend
        // debounce fetch by 300ms
        const timeoutId = setTimeout(async () => {
            try {
                const res = await fetch(
                    `${BACKEND_URL}/api/search?q=${searchQuery}`
                );
                if (res.ok) setSearchResults((await res.json()) || []);
            } catch (e) {
                console.error(e);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedCourse]);

    useEffect(() => {
        // fetch available sections when a course is selected
        if (!selectedCourse) return;

        // fetch sections from backend and set available sections
        const fetchSections = async () => {
            try {
                const res = await fetch(
                    `${BACKEND_URL}/api/sections?courseID=${selectedCourse.id}`
                );
                if (res.ok) setAvailableSections((await res.json()) || []);
            } catch (e) {
                console.error(e);
            }
        };
        // call the fetch function
        fetchSections();

        // reset selected section
        setSelectedSection(null);
    }, [selectedCourse]);

    // handler for adding class
    const handleAddClass = (e: React.FormEvent) => {
        // prevent default form submission
        e.preventDefault();

        // ensure a section is selected
        if (!selectedSection) return;

        // check if section is already in schedule
        if (schedule.some((c) => c.id === selectedSection.id)) {
            alert("You already added this section!");
            return;
        }

        // add selected section to schedule
        onUpdate([...schedule, selectedSection]);

        // reset and close form
        setShowForm(false);
        setSearchQuery("");
        setSelectedCourse(null);
        setSelectedSection(null);
    };

    return (
        <div className="w-full flex items-center justify-between bg-white">
            <div className="flex gap-3 items-baseline">
                <h2 className="text-lg text-gray-800 font-semibold ml-2">
                    Manage Current Classes
                </h2>
                <p className="h-fit text-xs text-muted-foreground">
                    {schedule.length} classes enrolled
                </p>
            </div>

            <Dialog.Dialog open={showForm} onOpenChange={setShowForm}>
                <Dialog.DialogTrigger asChild>
                    <Button variant="outline">+ Add Class</Button>
                </Dialog.DialogTrigger>

                <Dialog.DialogContent className="sm:max-w-[500px] p-6">
                    <Dialog.DialogHeader>
                        <Dialog.DialogTitle>Add Class</Dialog.DialogTitle>
                        <Dialog.DialogDescription>
                            Search for a course and select a section to add to
                            your schedule.
                        </Dialog.DialogDescription>
                    </Dialog.DialogHeader>

                    <form onSubmit={handleAddClass} className="space-y-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                1. Search Course
                            </label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border px-3 py-1 rounded uppercase"
                                placeholder="CS321"
                                disabled={!!selectedCourse}
                            />
                            {searchResults.length > 0 && !selectedCourse && (
                                <div className="border rounded mt-1 bg-white absolute w-full max-h-40 overflow-y-auto z-10 shadow-lg">
                                    {searchResults.map((c) => (
                                        <div
                                            key={c.id}
                                            onClick={() => {
                                                setSelectedCourse(c);
                                                setSearchQuery(c.id);
                                            }}
                                            className="p-2 hover:bg-gray-100 cursor-pointer"
                                        >
                                            <b>{c.id}</b> - {c.title}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedCourse && (
                                <div
                                    onClick={() => {
                                        setSelectedCourse(null);
                                        setSearchQuery("");
                                    }}
                                    className="text-xs text-blue-500 cursor-pointer flex justify-end"
                                >
                                    Change
                                </div>
                            )}
                        </div>

                        {selectedCourse && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    2. Select Section
                                </label>
                                <select
                                    className="w-full border px-3 py-1 rounded"
                                    onChange={(e) =>
                                        setSelectedSection(
                                            availableSections.find(
                                                (s) => s.id === e.target.value
                                            ) || null
                                        )
                                    }
                                    defaultValue=""
                                >
                                    <option disabled value="">
                                        Select...
                                    </option>
                                    {availableSections.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            Section {s.section} - {s.professor}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <Dialog.DialogFooter>
                            <Button
                                variant="outline"
                                size={"sm"}
                                onClick={() => setShowForm(false)}
                                type="button"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size={"sm"}
                                disabled={!selectedSection}
                                className="bg-blue-600 text-white"
                            >
                                Add Class
                            </Button>
                        </Dialog.DialogFooter>
                    </form>
                </Dialog.DialogContent>
            </Dialog.Dialog>
        </div>
    );
}
