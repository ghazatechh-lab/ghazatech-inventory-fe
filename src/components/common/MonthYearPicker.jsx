import React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const parsePeriod = (value) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!year || month < 1 || month > 12) {
    return null;
  }

  return {
    year,
    month,
  };
};

const toPeriod = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

const formatPeriod = (value) => {
  const parsed = parsePeriod(value);

  if (!parsed) {
    return "Select month";
  }

  return `${MONTHS[parsed.month - 1]} ${parsed.year}`;
};

export function MonthYearPicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  placeholder = "Select month",
  className,
  id,
}) {
  const selected = parsePeriod(value);
  const minPeriod = parsePeriod(min);
  const maxPeriod = parsePeriod(max);

  const currentYear = new Date().getFullYear();

  const minYear = minPeriod?.year ?? currentYear - 50;
  const maxYear = maxPeriod?.year ?? currentYear + 10;

  const initialYear = Math.min(
    Math.max(selected?.year ?? currentYear, minYear),
    maxYear,
  );

  const [open, setOpen] = React.useState(false);
  const [displayYear, setDisplayYear] = React.useState(initialYear);

  React.useEffect(() => {
    if (selected?.year) {
      setDisplayYear(Math.min(Math.max(selected.year, minYear), maxYear));
    }
  }, [selected?.year, minYear, maxYear]);

  const years = React.useMemo(() => {
    const result = [];

    for (let year = maxYear; year >= minYear; year -= 1) {
      result.push(year);
    }

    return result;
  }, [minYear, maxYear]);

  const isMonthDisabled = (month) => {
    const candidate = toPeriod(displayYear, month);

    if (min && candidate < min) {
      return true;
    }

    if (max && candidate > max) {
      return true;
    }

    return false;
  };

  const selectMonth = (month) => {
    if (isMonthDisabled(month)) {
      return;
    }

    onChange?.(toPeriod(displayYear, month));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start gap-2 rounded-md border bg-background px-3 text-left text-sm font-normal shadow-sm",
            "hover:bg-accent/40 hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />

          <span className="truncate">
            {value ? formatPeriod(value) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[300px] p-3 sm:w-[320px]">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={displayYear <= minYear}
            onClick={() =>
              setDisplayYear((year) => Math.max(minYear, year - 1))
            }
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select
            value={String(displayYear)}
            onValueChange={(nextYear) => setDisplayYear(Number(nextYear))}
          >
            <SelectTrigger className="h-8 flex-1">
              <SelectValue />
            </SelectTrigger>

            <SelectContent className="max-h-72">
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={displayYear >= maxYear}
            onClick={() =>
              setDisplayYear((year) => Math.min(maxYear, year + 1))
            }
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {MONTHS.map((monthName, index) => {
            const month = index + 1;
            const candidate = toPeriod(displayYear, month);

            const selectedMonth = candidate === value;
            const blocked = isMonthDisabled(month);

            return (
              <Button
                key={monthName}
                type="button"
                variant={selectedMonth ? "default" : "ghost"}
                size="sm"
                disabled={blocked}
                className={cn(
                  "h-9 justify-center px-2 text-xs sm:text-sm",
                  selectedMonth && "bg-blue-600 text-white hover:bg-blue-700",
                )}
                onClick={() => selectMonth(month)}
              >
                {monthName.slice(0, 3)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { formatPeriod as formatMonthYearPeriod };
