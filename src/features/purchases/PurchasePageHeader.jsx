import React from "react";

import { PageHeader as CommonPageHeader } from "@/components/common/PageHeader";

export function PageHeader(props) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-6 shadow-xl shadow-slate-950/10 sm:px-6 lg:px-7 print:overflow-visible print:rounded-none print:border-0 print:bg-none print:bg-white print:p-0 print:shadow-none">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl print:hidden" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl print:hidden" />

      <div className="relative z-10 [&_h1]:!text-white [&_.text-muted-foreground]:!text-slate-300 print:[&_h1]:!text-slate-950 print:[&_.text-muted-foreground]:!text-slate-600">
        <CommonPageHeader
          {...props}
          eyebrow={props.eyebrow || "Purchase management"}
        />
      </div>
    </section>
  );
}

export default PageHeader;

