import SimpleSalesPage from "@/components/sales/SimpleSalesPage";
export default function P() {
  return (
    <SimpleSalesPage
      title="Sales Reports"
      subtitle="Generate sales performance reports"
      keyName="sales-reports"
      endpoint="/sales/reports/"
      newLabel="New Report"
      initial={{
        report_name: "Monthly Sales Summary",
        report_type: "MONTHLY_SUMMARY",
        period: "THIS_MONTH",
        group_by: "CUSTOMER",
        sales_channel: "ALL",
        output_format: "PDF",
        include_line_items: true,
        owner_team: "Finance Team",
        recurrence: "ONCE",
        status: "READY",
      }}
      columns={[
        { key: "report_name", header: "Report" },
        { key: "period", header: "Period" },
        { key: "created_at", header: "Generated" },
        { key: "output_format", header: "Format" },
        { key: "owner_team", header: "Owner" },
        { key: "status", header: "Status" },
      ]}
      metrics={(s, M) => [
        <M key="a" label="Revenue MTD" value={s.revenue_mtd || 0} />,
        <M key="b" label="Orders MTD" value={s.orders_mtd || 0} />,
        <M key="c" label="Top customer" value={s.top_customer || "—"} />,
        <M
          key="d"
          label="Conversion rate"
          value={`${s.conversion_rate || 0}%`}
        />,
      ]}
    />
  );
}
