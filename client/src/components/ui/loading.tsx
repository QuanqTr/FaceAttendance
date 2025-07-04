import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface LoadingProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    textKey?: string;
    className?: string;
    fullPage?: boolean;
}

export function Loading({
    size = "md",
    text,
    textKey = "common.loading",
    className,
    fullPage = false,
}: LoadingProps) {
    const { t } = useTranslation();

    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    const spinner = (
        <div
            className={cn(
                "flex flex-col items-center justify-center",
                fullPage ? "h-screen w-full fixed inset-0 bg-background/80 z-50" : "",
                className
            )}
        >
            <svg
                className={cn("animate-spin text-primary", sizeClasses[size])}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                ></circle>
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
            </svg>

            {(text || textKey) && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    {text || t(textKey)}
                </p>
            )}
        </div>
    );

    return spinner;
}