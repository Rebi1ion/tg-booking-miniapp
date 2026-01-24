import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ru } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            locale={ru}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",

                table: "w-full border-collapse",

                // react-day-picker v9 uses "weekdays" instead of "head_row"
                weekdays: "grid grid-cols-7 w-full mb-1",
                weekday: "text-muted-foreground rounded-md font-normal text-[0.8rem] flex justify-center items-center py-1",

                // react-day-picker v9 uses "week" instead of "row"
                week: "grid grid-cols-7 w-full mt-1",

                // FIXED: Removed background from day cells - only selected should be highlighted
                day: "h-9 w-9 text-center p-0 relative focus-within:relative z-20 flex items-center justify-center rounded-md",

                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal transition-colors rounded-md",
                    "hover:bg-accent hover:text-accent-foreground"
                ),

                // Selected day styling - apply to the day cell AND the button inside
                selected: "bg-primary text-primary-foreground rounded-md shadow-sm [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",

                // Today - subtle underline instead of background
                day_today: "font-bold underline underline-offset-4",

                // Outside days (other month) - just muted, no background
                day_outside: "text-muted-foreground opacity-40",

                day_disabled: "text-muted-foreground opacity-50",
                day_range_end: "day-range-end",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation, ...props }) => {
                    const Icon = orientation === "left" ? ChevronLeft : ChevronRight
                    return <Icon className="h-4 w-4" {...props} />
                }
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }