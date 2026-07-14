import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/common/States";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * DataTable
 * columns: [{ key, header, cell, align, className }]
 * data: array
 * page, pageSize, total, onPageChange
 */
export function DataTable({ columns, data, isLoading, page = 1, pageSize = 20, total = 0, onPageChange, emptyTitle, emptyDescription, rowKey = "id", onRowClick, testId = "data-table" }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="card-surface overflow-hidden" data-testid={testId}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/5">
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn("text-[10px] tracking-[0.08em] uppercase font-semibold text-slate-500 py-3", c.align === "right" && "text-right", c.className)}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={columns.length}><LoadingState /></TableCell></TableRow>
            ) : data?.length ? (
              data.map((row, i) => (
                <TableRow
                  key={row[rowKey] ?? i}
                  className={cn("border-white/5 table-row-hover", onRowClick && "cursor-pointer")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  data-testid={`row-${row[rowKey] ?? i}`}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn("py-2.5 text-sm text-slate-200", c.align === "right" && "text-right", c.className)}>
                      {c.cell ? c.cell(row) : row[c.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {total > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-slate-500">
          <div>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} data-testid="pagination-prev"><ChevronLeft className="w-4 h-4" /></Button>
            <span className="font-numeric px-2">{page} / {pages}</span>
            <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPageChange?.(page + 1)} data-testid="pagination-next"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
