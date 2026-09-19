import React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  testId = "search-input",
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />

      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border-slate-200 bg-white pl-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:ring-blue-500/20 dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-100 dark:placeholder:text-slate-500"
        data-testid={testId}
      />
    </div>
  );
}
