import React from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDown01,
  ArrowDown10,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowUpDown,
  CalendarArrowDown,
  CalendarArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheckBig,
  CircleMinus,
  ListFilter,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DEFAULT_LIST_PAGE_SIZE = 12;

const NON_SORTABLE_KEYS = new Set(["actions", "action", "select", "checkbox"]);

const DEFAULT_STATUS_ORDER = [
  "DRAFT",
  "PENDING",
  "REQUESTED",
  "APPROVED",
  "CONFIRMED",
  "PROCESSING",
  "DISPATCHED",
  "IN_TRANSIT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "COMPLETED",
  "PAID",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
  "CANCELLED",
  "VOID",
  "FAILED",
];

const getNestedValue = (object, path) => {
  if (!object || !path) {
    return undefined;
  }

  return String(path)
    .split(".")
    .reduce((value, key) => value?.[key], object);
};

const toTimestamp = (value) => {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(value);

  return Number.isNaN(number) ? 0 : number;
};

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase();

const normalizeStatus = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

const compareText = (left, right) =>
  normalizeText(left).localeCompare(normalizeText(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });

const compareStatus = (left, right, statusOrder) => {
  const leftStatus = normalizeStatus(left);
  const rightStatus = normalizeStatus(right);

  const order = (statusOrder?.length ? statusOrder : DEFAULT_STATUS_ORDER).map(
    normalizeStatus,
  );

  const leftIndex = order.indexOf(leftStatus);
  const rightIndex = order.indexOf(rightStatus);

  if (leftIndex !== -1 || rightIndex !== -1) {
    const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;

    const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    if (safeLeft !== safeRight) {
      return safeLeft - safeRight;
    }
  }

  return compareText(leftStatus, rightStatus);
};

const compareValues = (left, right, column) => {
  const sortType = column.sortType || "text";

  if (typeof column.compare === "function") {
    return column.compare(left, right);
  }

  switch (sortType) {
    case "number":
    case "quantity":
    case "amount":
    case "currency":
      return toNumber(left) - toNumber(right);

    case "date":
    case "datetime":
    case "time":
      return toTimestamp(left) - toTimestamp(right);

    case "boolean":
    case "active":
      return Number(Boolean(right)) - Number(Boolean(left));

    case "status":
      return compareStatus(left, right, column.statusOrder);

    case "text":
    default:
      return compareText(left, right);
  }
};

const pageNumbers = (current, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(current - 2, totalPages - 4));

  return Array.from({ length: 5 }, (_, index) => start + index);
};

const getSortLabels = (column) => {
  const sortType = column.sortType || "text";

  switch (sortType) {
    case "number":
    case "quantity":
    case "amount":
    case "currency":
      return {
        ascending: "Lowest first",
        descending: "Highest first",
      };

    case "date":
    case "datetime":
    case "time":
      return {
        ascending: "Oldest first",
        descending: "Newest first",
      };

    case "status":
      return {
        ascending: "Status order ascending",
        descending: "Status order descending",
      };

    case "boolean":
    case "active":
      return {
        ascending: "Active first",
        descending: "Inactive first",
      };

    case "text":
    default:
      return {
        ascending: "A to Z",
        descending: "Z to A",
      };
  }
};

function SortIcon({ column, ascending, descending }) {
  const sortType = column.sortType || "text";

  if (!ascending && !descending) {
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
  }

  switch (sortType) {
    case "number":
    case "quantity":
    case "amount":
    case "currency":
      return ascending ? (
        <ArrowDown01 className="h-3.5 w-3.5 text-blue-400" />
      ) : (
        <ArrowDown10 className="h-3.5 w-3.5 text-blue-400" />
      );

    case "date":
    case "datetime":
    case "time":
      return ascending ? (
        <CalendarArrowUp className="h-3.5 w-3.5 text-blue-400" />
      ) : (
        <CalendarArrowDown className="h-3.5 w-3.5 text-blue-400" />
      );

    case "status":
      return <ListFilter className="h-3.5 w-3.5 text-blue-400" />;

    case "boolean":
    case "active":
      return ascending ? (
        <CircleCheckBig className="h-3.5 w-3.5 text-blue-400" />
      ) : (
        <CircleMinus className="h-3.5 w-3.5 text-blue-400" />
      );

    case "text":
    default:
      return ascending ? (
        <ArrowDownAZ className="h-3.5 w-3.5 text-blue-400" />
      ) : (
        <ArrowDownZA className="h-3.5 w-3.5 text-blue-400" />
      );
  }
}

/**
 * Shared listing table.
 *
 * Column configuration:
 *
 * {
 *   key: "created_at",
 *   header: "Created",
 *   sortKey: "created_at",
 *   sortType: "datetime",
 * }
 *
 * Supported sortType values:
 * - text
 * - number
 * - quantity
 * - amount
 * - currency
 * - date
 * - datetime
 * - time
 * - status
 * - boolean
 * - active
 *
 * For status sorting, an optional custom order can be supplied:
 *
 * {
 *   key: "status",
 *   sortType: "status",
 *   statusOrder: [
 *     "DRAFT",
 *     "APPROVED",
 *     "COMPLETED",
 *     "CANCELLED",
 *   ],
 * }
 */
export function DataTable({
  columns,
  data = [],
  isLoading,
  page = 1,
  pageSize = DEFAULT_LIST_PAGE_SIZE,
  total = 0,
  onPageChange,
  emptyTitle,
  emptyDescription,
  rowKey = "id",
  onRowClick,
  testId = "data-table",
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const ordering = searchParams.get("ordering") || "";

  const isServerPaginated = typeof onPageChange === "function";

  const currentPage = Math.max(1, Number(page) || 1);

  const setOrdering = (nextOrdering) => {
    const next = new URLSearchParams(searchParams);

    if (nextOrdering) {
      next.set("ordering", nextOrdering);
    } else {
      next.delete("ordering");
    }

    next.set("page", "1");
    setSearchParams(next);
  };

  const handleSort = (column) => {
    const sortKey = column.sortKey || column.key;

    if (
      column.sortable === false ||
      !sortKey ||
      NON_SORTABLE_KEYS.has(sortKey)
    ) {
      return;
    }

    if (ordering === sortKey) {
      setOrdering(`-${sortKey}`);
      return;
    }

    if (ordering === `-${sortKey}`) {
      setOrdering("");
      return;
    }

    setOrdering(sortKey);
  };

  const sortedData = React.useMemo(() => {
    if (!ordering || !Array.isArray(data)) {
      return data;
    }

    const descending = ordering.startsWith("-");

    const sortKey = descending ? ordering.slice(1) : ordering;

    const column = columns.find(
      (item) => (item.sortKey || item.key) === sortKey,
    );

    if (!column) {
      return data;
    }

    return [...data].sort((left, right) => {
      const leftValue = column.sortValue
        ? column.sortValue(left)
        : getNestedValue(left, column.valueKey || sortKey);

      const rightValue = column.sortValue
        ? column.sortValue(right)
        : getNestedValue(right, column.valueKey || sortKey);

      const comparison = compareValues(leftValue, rightValue, column);

      return descending ? -comparison : comparison;
    });
  }, [data, columns, ordering]);

  const effectiveTotal = isServerPaginated
    ? Number(total) || 0
    : sortedData.length;

  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));

  const safePage = Math.min(currentPage, totalPages);

  const visibleData = React.useMemo(() => {
    if (isServerPaginated) {
      return sortedData;
    }

    const start = (safePage - 1) * pageSize;

    return sortedData.slice(start, start + pageSize);
  }, [isServerPaginated, sortedData, safePage, pageSize]);

  const changePage = (nextPage) => {
    const resolvedPage = Math.max(1, Math.min(nextPage, totalPages));

    if (isServerPaginated) {
      onPageChange(resolvedPage);
      return;
    }

    const next = new URLSearchParams(searchParams);

    next.set("page", String(resolvedPage));

    setSearchParams(next);
  };

  const firstVisible = effectiveTotal ? (safePage - 1) * pageSize + 1 : 0;

  const lastVisible = Math.min(safePage * pageSize, effectiveTotal);

  return (
    <div className="card-surface overflow-hidden" data-testid={testId}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              {columns.map((column) => {
                const sortKey = column.sortKey || column.key;

                const sortable =
                  column.sortable !== false &&
                  Boolean(sortKey) &&
                  !NON_SORTABLE_KEYS.has(sortKey);

                const ascending = ordering === sortKey;

                const descending = ordering === `-${sortKey}`;

                const labels = getSortLabels(column);

                const nextLabel = ascending
                  ? labels.descending
                  : descending
                    ? "Clear sorting"
                    : labels.ascending;

                return (
                  <TableHead
                    key={column.key}
                    aria-sort={
                      ascending
                        ? "ascending"
                        : descending
                          ? "descending"
                          : "none"
                    }
                    className={cn(
                      "py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500",
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded px-1 py-1 transition hover:bg-white/5 hover:text-slate-200",
                          column.align === "right" && "ml-auto",
                        )}
                        title={`${column.header}: ${nextLabel}`}
                      >
                        <span>{column.header}</span>

                        <SortIcon
                          column={column}
                          ascending={ascending}
                          descending={descending}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <LoadingState />
                </TableCell>
              </TableRow>
            ) : visibleData.length ? (
              visibleData.map((row, index) => (
                <TableRow
                  key={row[rowKey] ?? index}
                  className={cn(
                    "table-row-hover border-white/5",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  data-testid={`row-${row[rowKey] ?? index}`}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "py-2.5 text-sm text-slate-200",
                        column.align === "right" && "text-right",
                        column.className,
                      )}
                    >
                      {column.cell
                        ? column.cell(row)
                        : getNestedValue(row, column.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/5 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing {firstVisible}–{lastVisible} of {effectiveTotal}
          <span className="ml-2 text-slate-600">
            · {pageSize} entries per page
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => changePage(1)}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => changePage(safePage - 1)}
            data-testid="pagination-prev"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pageNumbers(safePage, totalPages).map((pageNumber) => (
            <Button
              key={pageNumber}
              type="button"
              variant={pageNumber === safePage ? "secondary" : "ghost"}
              size="sm"
              className="min-w-8 font-numeric"
              onClick={() => changePage(pageNumber)}
            >
              {pageNumber}
            </Button>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => changePage(safePage + 1)}
            data-testid="pagination-next"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => changePage(totalPages)}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
