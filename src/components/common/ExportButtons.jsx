import React from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

export function ExportButtons({ onExcel, onPdf }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onExcel || (() => toast.info("Excel export coming soon"))} data-testid="export-excel-btn">
        <Download className="w-3.5 h-3.5 mr-1.5" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={onPdf || (() => toast.info("PDF export coming soon"))} data-testid="export-pdf-btn">
        <FileText className="w-3.5 h-3.5 mr-1.5" /> PDF
      </Button>
    </div>
  );
}
