import React from "react";

/** Audit attribution from the API; missing historical actors remain unknown. */
export function UpdatedByMeta({ record, compact = false }) {
  if (!record || typeof record !== "object") return null;
  const resolve = (...keys) => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim() && !/^\d+$/.test(value.trim())) return value;
      if (value && typeof value === "object") {
        const name = value.full_name || value.name || value.username || value.email;
        if (name) return name;
      }
    }
    return "Not recorded";
  };
  const people = [
    ["Added By", resolve("added_by_name", "created_by_name", "created_by", "added_by"), record.added_by_at || record.created_at],
    ["Updated By", resolve("updated_by_name", "last_updated_by_name", "updated_by"), record.updated_by_at || record.updated_at],
  ];
  return (
    <div className={compact
      ? "mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-current/80"
      : "flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}>
      {people.map(([label, actor, stamp]) => (
        <span key={label}>
          <strong>{label}:</strong> {actor}
          {stamp && !Number.isNaN(Date.parse(stamp)) && (
            <span className="ml-1 opacity-70">({new Date(stamp).toLocaleString()})</span>
          )}
        </span>
      ))}
    </div>
  );
}
