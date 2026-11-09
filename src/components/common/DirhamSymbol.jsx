import React from "react";

/** Official UAE dirham mark, traced from the monochrome reference artwork. */
export function DirhamSymbol({ className = "", title = "UAE dirham", ...props }) {
  return (
    <img
      src="/images/uae-dirham.svg"
      alt={title}
      className={`inline-block h-[0.95em] w-[1.15em] shrink-0 object-contain align-[-0.12em] dark:invert ${className}`}
      draggable={false}
      {...props}
    />
  );
}

export default DirhamSymbol;
