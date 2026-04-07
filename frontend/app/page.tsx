"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

import gdg_logo from "@/public/logo.png";

import { Header } from "@/components/header";

export default function LandingPage() {
    const [activeCard, setActiveCard] = useState(0);
    const [progress, setProgress] = useState(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        const progressInterval = setInterval(() => {
            if (!mountedRef.current) return;

            setProgress((prev) => {
                if (prev >= 100) {
                    if (mountedRef.current) {
                        setActiveCard((current) => (current + 1) % 3);
                    }
                    return 0;
                }
                return prev + 2;
            });
        }, 100);

        return () => {
            clearInterval(progressInterval);
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    return (
        <div className="w-full min-h-screen relative bg-[var(--background-muted)] overflow-x-hidden flex flex-col justify-start items-center w-full">
            <div className="w-full max-w-none bg-background px-4 sm:px-6 md:px-8 lg:px-0 lg:max-w-5xl lg:w-5xl relative flex flex-col justify-start items-start min-h-screen">
                {/* vertical lines */}
                <div className="w-[1px] h-full absolute left-4 sm:left-6 md:left-8 lg:left-0 top-0 bg-ring shadow-[1px_0px_0px_white] z-0"></div>
                <div className="w-[1px] h-full absolute right-4 sm:right-6 md:right-8 lg:right-0 top-0 bg-ring shadow-[1px_0px_0px_white] z-0"></div>

                <div className="self-stretch mb-12 overflow-hidden flex flex-col justify-center items-center gap-4 sm:gap-6 md:gap-8 relative z-10">
                    <Header />
                    <div className="pt-16 sm:pt-20 md:pt-24 lg:pt-56 pb-8 sm:pb-12 md:pb-24 flex flex-col justify-start items-center px-2 sm:px-4 md:px-8 lg:px-0 w-full sm:pl-0 sm:pr-0 pl-0 pr-0">
                        <div className="w-full max-w-3xl text-center flex justify-center flex-col text-muted-foreground text-[24px] xs:text-[28px] sm:text-[36px] md:text-[52px] lg:text-[72px] font-normal leading-[1.2] font-serif px-2 sm:px-4 md:px-0">
                            dormant: <br />{" "}
                            <p className="text-[24px] xs:text-[28px] sm:text-[36px] md:text-[52px] lg:text-[56px]">
                                effortless semester scheduler
                            </p>
                            <div className="text-[14px] xs:text-[18px] sm:text-[22px] md:text-[26px] lg:text-[32px] flex items-center justify-center">
                                by
                                <Image
                                    src={gdg_logo}
                                    alt="gdg logo"
                                    className="inline-block align-text-bottom h-7 w-auto ml-3 mt-0.5"
                                />
                                @GMU
                            </div>
                        </div>
                        <div className="w-full max-w-lg pt-8 text-center flex justify-center flex-col text-muted-foreground/70 sm:text-lg md:text-xl leading-[1.4] font-serif">
                            Streamline your semester scheduling process with
                            automated scheduling, recommendations, and conflict
                            resolution; all in one platform.
                        </div>

                        <div
                            className="my-12 flex items-center justify-center text-muted-foreground text-sm sm:text-base font-sans font-medium border border-muted-foreground/10 px-6 py-1 rounded-full inset-shadow-sm hover:cursor-pointer hover:bg-muted/80"
                            onClick={() => {
                                window.location.href =
                                    "http://localhost:5000/auth/google";
                            }}
                        >
                            Start for free with{" "}
                            <svg
                                version="1.1"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 48 48"
                                className="w-4 h-4 ml-2"
                            >
                                <path
                                    fill="#EA4335"
                                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                                ></path>
                                <path
                                    fill="#4285F4"
                                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                                ></path>
                                <path
                                    fill="#FBBC05"
                                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                                ></path>
                                <path
                                    fill="#34A853"
                                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                                ></path>
                                <path fill="none" d="M0 0h48v48H0z"></path>
                            </svg>
                        </div>

                        <div className="w-full h-[600px] max-w-3xl lg:w-3xl px-3 relative flex justify-center items-center">
                            <div
                                className={`absolute transition-all duration-500 ease-in-out ${
                                    activeCard === 0
                                        ? "opacity-100 scale-100 blur-0"
                                        : "opacity-0 scale-95 blur-sm"
                                }`}
                            >
                                <img
                                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/dsadsadsa.jpg-xTHS4hGwCWp2H5bTj8np6DXZUyrxX7.jpeg"
                                    alt="img1"
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                            <div
                                className={`absolute transition-all duration-500 ease-in-out ${
                                    activeCard === 1
                                        ? "opacity-100 scale-100 blur-0"
                                        : "opacity-0 scale-95 blur-sm"
                                }`}
                            >
                                <img
                                    src="https://static.wixstatic.com/media/74ba78_d5b7ae6a08394a14b76f17dcb245688e~mv2.png"
                                    alt="img2"
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                            <div
                                className={`absolute transition-all duration-500 ease-in-out ${
                                    activeCard === 2
                                        ? "opacity-100 scale-100 blur-0"
                                        : "opacity-0 scale-95 blur-sm"
                                }`}
                            >
                                <img
                                    src="https://static.wixstatic.com/media/74ba78_903a231056be49f4a4ffcf7d4dfef4d0~mv2.png"
                                    alt="img3"
                                    className="w-full h-auto object-contain"
                                />
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-ring rounded-full transition-all duration-100 ease-in-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
                <footer className="self-stretch w-full h-12 border-t border-ring flex justify-center items-center text-muted-foreground text-xs font-serif">
                    © 2025 dormant. Google Developer Groups@GMU. All rights
                    reserved.
                </footer>
            </div>
        </div>
    );
}
