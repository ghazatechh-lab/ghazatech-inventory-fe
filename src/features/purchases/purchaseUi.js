import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileText } from "lucide-react";

import { CurrencyText, DateText } from "@/components/common/CurrencyText";
import { StatusBadge } from "@/components/common/StatusBadge";

export function normalizeApiResponse(value) {
  let current = value;

  for (let index = 0; index < 5; index += 1) {
    if (!current || Array.isArray(current)) {
      break;
    }

    if (
      Array.isArray(current.results) ||
      Object.prototype.hasOwnProperty.call(current, "count") ||
      Object.prototype.hasOwnProperty.call(current, "id")
    ) {
      break;
    }

    if (current.data !== undefined && current.data !== current) {
      current = current.data;
      continue;
    }

    break;
  }

  if (Array.isArray(current)) {
    return {
      count: current.length,
      results: current,
    };
  }

  return (
    current || {
      count: 0,
      results: [],
    }
  );
}

export function rowsFromPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

export function DetailField({ label, value }) {
  const isEmpty = value === undefined || value === null || value === "";

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <div className="mt-1 break-words text-sm font-medium">
        {isEmpty ? "—" : value}
      </div>
    </div>
  );
}

export function DetailSection({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border bg-card">
      <div className="border-b p-5">
        <h2 className="font-semibold">{title}</h2>

        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

export function AttachmentList({ attachments = [] }) {
  if (!attachments.length) {
    return (
      <p className="text-sm text-muted-foreground">No attachments uploaded.</p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {attachments.map((attachment) => {
        const url = attachment.file_url || attachment.file;

        const label =
          attachment.original_name ||
          attachment.name ||
          `Attachment ${attachment.id}`;

        const fileSize = Number(attachment.file_size || 0);

        return (
          <a
            key={attachment.id || url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{label}</p>

                <p className="text-xs text-muted-foreground">
                  {attachment.content_type || "File"}

                  {fileSize > 0 ? ` • ${Math.ceil(fileSize / 1024)} KB` : ""}
                </p>
              </div>
            </div>

            <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
        );
      })}
    </div>
  );
}

export function renderDate(value) {
  return value ? <DateText value={value} /> : "—";
}

export function renderMoney(value) {
  return <CurrencyText value={value || 0} />;
}

export function renderStatus(value) {
  return <StatusBadge status={value || "DRAFT"} />;
}

export function DocumentLink({ to, children }) {
  return (
    <Link
      to={to}
      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
    >
      {children}
    </Link>
  );
}
