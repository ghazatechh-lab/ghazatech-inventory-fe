import React from "react";

export function DirhamSymbol({
  size = 16,
  className = "",
  title = "UAE Dirham",
  decorative = false,
  ...props
}) {
  return (
    <svg
      viewBox="0 0 108 94"
      width={size}
      height={size}
      aria-hidden={decorative ? "true" : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M 13.00 4.00 L 17.00 13.00 L 17.00 33.00 L 6.00 34.00 L 4.00 32.00 L 4.00 36.00 L 9.00 42.00 L 17.00 43.00 L 16.00 51.00 L 4.00 50.00 L 7.00 58.00 L 17.00 60.00 L 17.00 81.00 L 13.00 89.00 L 55.00 89.00 L 71.00 84.00 L 81.00 76.00 L 90.00 59.00 L 100.00 59.00 L 103.00 61.00 L 102.00 55.00 L 99.00 52.00 L 90.00 50.00 L 90.00 43.00 L 100.00 42.00 L 103.00 44.00 L 102.00 38.00 L 96.00 34.00 L 89.00 34.00 L 82.00 19.00 L 73.00 11.00 L 65.00 7.00 L 52.00 4.00 Z M 29.00 85.00 L 29.00 60.00 L 30.00 59.00 L 73.00 59.00 L 74.00 60.00 L 74.00 64.00 L 73.00 65.00 L 73.00 67.00 L 71.00 70.00 L 71.00 72.00 L 68.00 75.00 L 68.00 76.00 L 64.00 80.00 L 63.00 80.00 L 61.00 82.00 L 60.00 82.00 L 57.00 84.00 L 55.00 84.00 L 54.00 85.00 L 49.00 85.00 L 48.00 86.00 L 30.00 86.00 Z M 29.00 43.00 L 30.00 42.00 L 75.00 42.00 L 76.00 43.00 L 76.00 50.00 L 75.00 51.00 L 30.00 51.00 L 29.00 50.00 Z M 29.00 8.00 L 30.00 7.00 L 46.00 7.00 L 47.00 8.00 L 53.00 8.00 L 54.00 9.00 L 56.00 9.00 L 57.00 10.00 L 59.00 10.00 L 60.00 11.00 L 61.00 11.00 L 64.00 14.00 L 65.00 14.00 L 70.00 20.00 L 70.00 21.00 L 73.00 26.00 L 73.00 28.00 L 74.00 29.00 L 74.00 32.00 L 75.00 33.00 L 74.00 34.00 L 30.00 34.00 L 29.00 33.00 Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default DirhamSymbol;
