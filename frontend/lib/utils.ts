import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BACKEND_URL } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface User {
    UserID: string;
    Name: string;
    Email: string;
    AvatarURL: string;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/auth/profile`, {
                    method: "GET",
                    credentials: "include",
                });

                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.warn("Failed to fetch user", error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const handleSignOut = async () => {
        try {
            // clear cookie
            await fetch(`${BACKEND_URL}/auth/signout`, {
                method: "GET",
                credentials: "include",
            });
            // clear local state
            setUser(null);
            router.refresh();
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return { user, loading, handleSignOut };
}

export const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helper to ensure we have minutes as a number
export const ensureMinutes = (time: number | string): number => {
    if (typeof time === "number") return time;
    if (typeof time === "string") return timeStringToMinutes(time);
    return 0;
};

// convert minutes to string
// 600 -> "10:00 AM"
export const formatTime = (time: number | string) => {
    const minutes = ensureMinutes(time);
    if (isNaN(minutes)) return "TBA";

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

// convert string to minutes for grid logic
// "9:00 AM" -> 540
export const timeStringToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(" ");
    if (!time) return 0;

    let [hours, minutes] = time.split(":").map(Number);
    if (hours === 12) hours = 0;
    if (modifier === "PM") hours += 12;
    return hours * 60 + minutes;
};
