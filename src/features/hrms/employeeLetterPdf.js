import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const dateText = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-GB");
};

const header = (doc, title, reference, letterDate) => {
  const width = doc.internal.pageSize.getWidth();
  const margin = 16;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 25, 28);
  doc.setFontSize(30);
  doc.text("GC", width / 2, 22, { align: "center" });

  doc.setFontSize(11);
  doc.text("GHAZA COMPUTER TRADING LLC", width / 2, 31, {
    align: "center",
  });

  doc.setTextColor(204, 35, 40);
  doc.setFontSize(14);
  doc.text(title, width / 2, 44, { align: "center" });

  doc.setTextColor(80, 80, 85);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Reference No.: ${reference || "—"}`, margin, 56);
  doc.text(`Date: ${dateText(letterDate)}`, width - margin, 56, {
    align: "right",
  });

  return { width, margin };
};

const signature = (doc, y, letter) => {
  const margin = 16;

  doc.setTextColor(30, 30, 34);
  doc.setFont("helvetica", "bold");
  doc.text("For Ghaza Computer Trading LLC", margin, y);

  doc.setFont("helvetica", "normal");
  doc.text(
    `Authorized Signatory: ${letter.authorized_signatory || "—"}`,
    margin,
    y + 12,
  );
  doc.text(
    `Designation: ${letter.signatory_designation || "—"}`,
    margin,
    y + 19,
  );
};

export function generateEmployeeLetterPdf(letter) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const isWarning = letter.letter_type === "WARNING";
  const title = isWarning ? "WARNING LETTER" : "EXPERIENCE LETTER";
  const { width, margin } = header(
    doc,
    title,
    letter.reference_number,
    letter.letter_date,
  );

  if (isWarning) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 34);
    doc.setFontSize(11);
    doc.text(`To: ${letter.employee_name || "Employee"}`, margin, 72);

    doc.setFont("helvetica", "normal");
    doc.text(`Employee Code: ${letter.employee_code || "—"}`, margin, 80);
    doc.text(`Designation: ${letter.designation_name || "—"}`, margin, 87);

    doc.setFont("helvetica", "bold");
    doc.text(`Subject: ${letter.subject || "Warning Letter"}`, margin, 101);

    doc.setFont("helvetica", "normal");
    const intro =
      "This letter serves as a formal warning regarding the matter described below.";
    doc.text(doc.splitTextToSize(intro, width - margin * 2), margin, 111);

    autoTable(doc, {
      startY: 124,
      margin: { left: margin, right: margin },
      theme: "grid",
      body: [
        ["Reason", letter.reason || "—"],
        ["Details / Required Improvement", letter.details || "—"],
      ],
      styles: {
        fontSize: 10,
        cellPadding: 4,
        overflow: "linebreak",
      },
      columnStyles: {
        0: {
          fontStyle: "bold",
          fillColor: [246, 247, 249],
          cellWidth: 48,
        },
      },
    });

    const y = doc.lastAutoTable.finalY + 12;
    const closing =
      "You are expected to take immediate corrective action and maintain the standards required by the company. Repetition of the issue may result in further disciplinary action in accordance with company policy.";
    doc.text(doc.splitTextToSize(closing, width - margin * 2), margin, y);

    signature(doc, y + 34, letter);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 34);
    doc.setFontSize(12);
    doc.text("TO WHOM IT MAY CONCERN", margin, 72);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);

    const intro = `This is to certify that ${letter.employee_name || "the employee"} was employed with Ghaza Computer Trading LLC in the capacity of ${letter.designation_name || "Employee"}.`;
    doc.text(doc.splitTextToSize(intro, width - margin * 2), margin, 82);

    autoTable(doc, {
      startY: 100,
      margin: { left: margin, right: margin },
      theme: "grid",
      body: [
        ["Employee Name", letter.employee_name || "—"],
        ["Employee Code", letter.employee_code || "—"],
        ["Designation", letter.designation_name || "—"],
        ["Department", letter.department_name || "—"],
        ["Date of Joining", dateText(letter.joining_date)],
        ["Last Working Date", dateText(letter.last_working_date)],
      ],
      styles: { fontSize: 9.5, cellPadding: 3 },
      columnStyles: {
        0: {
          fontStyle: "bold",
          fillColor: [246, 247, 249],
          cellWidth: 55,
        },
      },
    });

    let y = doc.lastAutoTable.finalY + 10;

    if (letter.experience_summary) {
      doc.text(
        doc.splitTextToSize(letter.experience_summary, width - margin * 2),
        margin,
        y,
      );
      y += 28;
    }

    const conduct =
      letter.conduct_note ||
      "During the employment period, the employee carried out assigned duties and responsibilities.";

    doc.text(doc.splitTextToSize(conduct, width - margin * 2), margin, y);
    y += 22;

    const closing =
      "We wish the employee success in future professional endeavors.";
    doc.text(doc.splitTextToSize(closing, width - margin * 2), margin, y);

    signature(doc, y + 24, letter);
  }

  doc.save(`${letter.reference_number || title.replaceAll(" ", "-")}.pdf`);
}
