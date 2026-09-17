import * as React from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MONTH_NAMES = [
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (value) => String(value).padStart(2, "0");

const toIsoDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseIsoDate = (value) => {
  if (!value || typeof value !== "string") return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const formatDisplayDate = (value, placeholder = "Select date") => {
  const date = parseIsoDate(value);

  if (!date) return placeholder;

  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

const getYearFromLimit = (value, fallback) => {
  const parsed = parseIsoDate(value);
  return parsed ? parsed.getFullYear() : fallback;
};

const DatePickerInput = React.forwardRef(
  (
    {
      className,
      value,
      defaultValue,
      onChange,
      onBlur,
      disabled,
      placeholder = "Select date",
      id,
      name,
      min,
      max,
      required,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const controlled = value !== undefined;
    const initialValue = controlled ? value : defaultValue || "";

    const [internalValue, setInternalValue] = React.useState(
      initialValue || "",
    );
    const currentValue = controlled ? value || "" : internalValue;

    const selectedDate = parseIsoDate(currentValue);
    const today = React.useMemo(() => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }, []);

    const initialView = selectedDate || today;

    const [open, setOpen] = React.useState(false);
    const [viewYear, setViewYear] = React.useState(initialView.getFullYear());
    const [viewMonth, setViewMonth] = React.useState(initialView.getMonth());
    const [draftDate, setDraftDate] = React.useState(selectedDate);

    React.useEffect(() => {
      if (!open) return;

      const parsed = parseIsoDate(currentValue) || today;
      setDraftDate(parseIsoDate(currentValue));
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }, [open, currentValue, today]);

    React.useEffect(() => {
      if (!controlled) return;
      setInternalValue(value || "");
    }, [controlled, value]);

    const minDate = parseIsoDate(min);
    const maxDate = parseIsoDate(max);

    const minYear = getYearFromLimit(
      min,
      Math.min(today.getFullYear() - 10, viewYear - 5),
    );
    const maxYear = getYearFromLimit(
      max,
      Math.max(today.getFullYear() + 10, viewYear + 5),
    );

    const years = React.useMemo(() => {
      const start = Math.min(minYear, viewYear);
      const end = Math.max(maxYear, viewYear);
      const values = [];

      for (let year = start; year <= end; year += 1) {
        values.push(year);
      }

      return values;
    }, [minYear, maxYear, viewYear]);

    const commitValue = (nextValue) => {
      if (!controlled) {
        setInternalValue(nextValue);
      }

      if (onChange) {
        onChange({
          target: {
            value: nextValue,
            name,
            id,
          },
          currentTarget: {
            value: nextValue,
            name,
            id,
          },
        });
      }
    };

    const isOutsideRange = (date) => {
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;
      return false;
    };

    const moveMonth = (delta) => {
      const next = new Date(viewYear, viewMonth + delta, 1);
      setViewYear(next.getFullYear());
      setViewMonth(next.getMonth());
    };

    const chooseDay = (day) => {
      const next = new Date(viewYear, viewMonth, day);

      if (isOutsideRange(next)) return;

      setDraftDate(next);
    };

    const selectToday = () => {
      if (isOutsideRange(today)) return;

      setDraftDate(today);
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    };

    const clearDate = () => {
      setDraftDate(null);
      commitValue("");
      setOpen(false);

      if (onBlur) {
        onBlur({
          target: { value: "", name, id },
          currentTarget: { value: "", name, id },
        });
      }
    };

    const applyDate = () => {
      if (!draftDate) {
        commitValue("");
      } else {
        commitValue(toIsoDate(draftDate));
      }

      setOpen(false);

      if (onBlur) {
        const applied = draftDate ? toIsoDate(draftDate) : "";
        onBlur({
          target: { value: applied, name, id },
          currentTarget: { value: applied, name, id },
        });
      }
    };

    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    return (
      <div className={cn("relative w-full", className)}>
        <input
          ref={ref}
          type="hidden"
          id={id}
          name={name}
          value={currentValue}
          required={required}
          readOnly
          {...props}
        />

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={ariaLabel || placeholder}
              className={cn(
                "flex h-9 w-full items-center justify-between gap-3 rounded-md border border-input bg-transparent px-3 py-1 text-left text-base shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                !currentValue && "text-muted-foreground",
              )}
            >
              <span className="truncate">
                {formatDisplayDate(currentValue, placeholder)}
              </span>

              <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <ChevronDown className="h-3.5 w-3.5" />
              </span>
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-[360px] max-w-[calc(100vw-2rem)] rounded-xl p-3"
          >
            <div className="grid grid-cols-[1fr_1.25fr] gap-2">
              <select
                value={viewYear}
                onChange={(event) => setViewYear(Number(event.target.value))}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={viewMonth}
                onChange={(event) => setViewMonth(Number(event.target.value))}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                {MONTH_NAMES.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-input transition hover:bg-muted"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <p className="text-sm font-semibold">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </p>

              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-input transition hover:bg-muted"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="py-1 text-center text-[10px] font-medium text-muted-foreground"
                >
                  {weekday}
                </div>
              ))}

              {Array.from({ length: firstWeekday }).map((_, index) => (
                <div key={`blank-${index}`} className="h-9" />
              ))}

              {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
                (day) => {
                  const date = new Date(viewYear, viewMonth, day);
                  const disabledDay = isOutsideRange(date);

                  const selected =
                    draftDate &&
                    draftDate.getFullYear() === viewYear &&
                    draftDate.getMonth() === viewMonth &&
                    draftDate.getDate() === day;

                  const isToday =
                    today.getFullYear() === viewYear &&
                    today.getMonth() === viewMonth &&
                    today.getDate() === day;

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={disabledDay}
                      onClick={() => chooseDay(day)}
                      className={cn(
                        "grid h-9 place-items-center rounded-lg border border-transparent text-xs transition",
                        "hover:border-border hover:bg-muted",
                        selected &&
                          "border-primary bg-primary text-primary-foreground hover:bg-primary",
                        isToday &&
                          !selected &&
                          "border-blue-400/70 font-semibold text-blue-600 dark:text-blue-400",
                        disabledDay &&
                          "cursor-not-allowed opacity-30 hover:border-transparent hover:bg-transparent",
                      )}
                    >
                      {day}
                    </button>
                  );
                },
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <button
                type="button"
                onClick={clearDate}
                className="rounded-lg border border-input px-3 py-2 text-xs font-medium transition hover:bg-muted"
              >
                Clear
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectToday}
                  className="rounded-lg border border-input px-3 py-2 text-xs font-medium transition hover:bg-muted"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={applyDate}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Apply
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

DatePickerInput.displayName = "DatePickerInput";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  if (type === "date") {
    return <DatePickerInput ref={ref} className={className} {...props} />;
  }

  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };

