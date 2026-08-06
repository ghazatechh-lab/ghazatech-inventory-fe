import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  FileText,
  Printer,
  RefreshCcw,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  AttachmentList,
  DetailField,
  DetailSection,
  normalizeApiResponse,
  renderDate,
  renderMoney,
  renderStatus,
} from "./purchaseUi";

function displayValue(value, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.display_name ||
      value.supplier_name ||
      value.branch_name ||
      value.po_number ||
      value.bill_number ||
      value.return_number ||
      value.credit_number ||
      value.email ||
      value.username ||
      value.id ||
      fallback
    );
  }

  return value;
}

function displayUser(value) {
  if (!value) {
    return "—";
  }

  if (typeof value === "object") {
    return (
      value.full_name ||
      value.display_name ||
      value.name ||
      value.email ||
      value.username ||
      `User ${value.id || ""}`.trim()
    );
  }

  return value;
}

function normalizeNestedList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : "text-sm"}>{value}</span>
    </div>
  );
}

export default function VendorCreditDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["VendorCreditDetailPage", id],
    queryFn: async () =>
      normalizeApiResponse(
        await api.get(`/purchases/vendor-credits/${id}/`, {
          skipGlobalErrorToast: true,
        }),
      ),
    enabled: Boolean(id),
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });

  const approveMutation = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post(
          `/purchases/vendor-credits/${id}/approve/`,
          {},
          {
            skipGlobalErrorToast: true,
          },
        ),
      ),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["VendorCreditDetailPage", id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["vendor-credit", id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["vendor-credits"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["vendor-credit-summary"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["supplier-bills"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["supplier-bills-summary"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["supplier-returns"],
        }),
      ]);

      toast.success("Vendor credit approved successfully.");

      await query.refetch();
    },

    onError: (error) => {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to approve vendor credit", {
        description:
          details.summary ||
          details.message ||
          "Only a draft or pending vendor credit can be approved.",
      });
    },
  });

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
        Loading vendor credit details...
      </div>
    );
  }

  const record = query.data;

  const normalizedStatus = String(record?.status || "DRAFT").toUpperCase();

  const isPersistentlyApproved = Boolean(
    normalizedStatus === "APPROVED" &&
    record?.approval_date &&
    record?.approved_by,
  );

  const canApprove =
    !isPersistentlyApproved &&
    ["DRAFT", "PENDING", "OPEN"].includes(normalizedStatus) &&
    !record?.posted_at;

  const canEdit = !isPersistentlyApproved && normalizedStatus === "DRAFT";

  if (query.isError || !record) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate("/purchases/vendor-credits")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />

            <div>
              <p className="font-semibold">Unable to load details</p>

              <p className="mt-1 text-sm">
                {query.error?.response?.data?.detail ||
                  query.error?.response?.data?.message ||
                  query.error?.message ||
                  "Check the browser console and backend logs."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items = normalizeNestedList(record.items);
  const applications = normalizeNestedList(record.applications);
  const attachments = normalizeNestedList(record.attachments);

  const supplierName = record.supplier_name || displayValue(record.supplier);

  const supplierReturnNumber =
    record.supplier_return_number || displayValue(record.supplier_return);

  const purchaseOrderNumber =
    record.po_number || displayValue(record.purchase_order);

  const supplierBillNumber =
    record.bill_number || displayValue(record.supplier_bill);

  const branchName = record.branch_name || displayValue(record.branch);

  const itemSubtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(
        item.subtotal ??
          Number(item.quantity || 0) * Number(item.unit_price || 0),
      ),
    0,
  );

  const itemTax = items.reduce(
    (sum, item) => sum + Number(item.tax_amount || 0),
    0,
  );

  const itemTotal = items.reduce(
    (sum, item) => sum + Number(item.line_total || 0),
    0,
  );

  const appliedTotal = applications.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={record.credit_number || `Vendor Credit ${id}`}
        subtitle="Complete vendor credit information, linked documents, financial values, and audit history."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/purchases/vendor-credits")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              variant="outline"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${
                  query.isFetching ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>

            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            {canEdit ? (
              <Button asChild variant="outline">
                <Link to={`/purchases/vendor-credits/${id}/edit`}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            ) : null}

            {canApprove ? (
              <Button
                type="button"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {approveMutation.isPending
                  ? "Approving..."
                  : "Approve Vendor Credit"}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Vendor Credit Workflow</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Draft → Approved → Open → Partially Applied → Fully Applied
            </p>
          </div>

          <div className="text-sm">
            Current status:{" "}
            <span className="font-semibold">
              {String(record.status_display || record.status || "DRAFT")}
            </span>
            <span className="ml-3 text-xs text-muted-foreground">
              {isPersistentlyApproved
                ? "Approved in backend"
                : record?.posted_at
                  ? "Credit already posted/applied"
                  : "Not yet approved in backend"}
            </span>
          </div>
        </div>
      </div>

      <DetailSection title="Vendor Credit Information">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField
            label="Credit Number"
            value={displayValue(record.credit_number)}
          />

          <DetailField
            label="Status"
            value={renderStatus(
              record.status_display || record.status || "DRAFT",
            )}
          />

          <DetailField
            label="Credit Date"
            value={renderDate(record.credit_date)}
          />

          <DetailField
            label="Currency"
            value={displayValue(record.currency, "AED")}
          />

          <DetailField label="Supplier" value={supplierName} />

          <DetailField label="Branch" value={branchName} />

          <DetailField
            label="Reason"
            value={record.reason_display || displayValue(record.reason)}
          />

          <DetailField
            label="Reference Number"
            value={displayValue(record.reference_number)}
          />

          <DetailField label="Supplier Return" value={supplierReturnNumber} />

          <DetailField label="Purchase Order" value={purchaseOrderNumber} />

          <DetailField label="Supplier Bill" value={supplierBillNumber} />

          <DetailField
            label="Item Count"
            value={record.item_count ?? items.length}
          />
        </div>
      </DetailSection>

      <DetailSection title="Financial Summary">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField
              label="Subtotal"
              value={renderMoney(
                record.subtotal ?? itemSubtotal,
                record.currency,
              )}
            />

            <DetailField
              label="Tax Amount"
              value={renderMoney(record.tax_amount ?? itemTax, record.currency)}
            />

            <DetailField
              label="Total Amount"
              value={renderMoney(
                record.total_amount ?? itemTotal,
                record.currency,
              )}
            />

            <DetailField
              label="Applied Amount"
              value={renderMoney(
                record.applied_amount ?? appliedTotal,
                record.currency,
              )}
            />

            <DetailField
              label="Remaining Amount"
              value={renderMoney(record.remaining_amount, record.currency)}
            />

            <DetailField
              label="Application Count"
              value={applications.length}
            />
          </div>

          <div className="rounded-xl border bg-muted/20 px-4">
            <SummaryRow
              label="Subtotal"
              value={renderMoney(
                record.subtotal ?? itemSubtotal,
                record.currency,
              )}
            />

            <SummaryRow
              label="Tax"
              value={renderMoney(record.tax_amount ?? itemTax, record.currency)}
            />

            <SummaryRow
              label="Total Credit"
              value={renderMoney(
                record.total_amount ?? itemTotal,
                record.currency,
              )}
              strong
            />

            <SummaryRow
              label="Applied"
              value={renderMoney(
                record.applied_amount ?? appliedTotal,
                record.currency,
              )}
            />

            <SummaryRow
              label="Remaining"
              value={renderMoney(record.remaining_amount, record.currency)}
              strong
            />
          </div>
        </div>
      </DetailSection>

      <DetailSection title={`Credit Items (${items.length})`}>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Description",
                  "Quantity",
                  "Unit Price",
                  "Subtotal",
                  "VAT Treatment",
                  "VAT %",
                  "VAT Amount",
                  "Line Total",
                  "GL Account",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => {
                const quantity = Number(item.quantity || 0);
                const unitPrice = Number(item.unit_price || 0);
                const subtotal = Number(item.subtotal) || quantity * unitPrice;

                return (
                  <tr
                    key={item.id || `${item.description}-${index}`}
                    className="border-b"
                  >
                    <td className="px-4 py-4">
                      <div className="purchase-module-page purchase-workspace font-medium">
                        {item.description || "—"}
                      </div>

                      {item.product_name ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.product_name}
                          {item.sku ? ` · ${item.sku}` : ""}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4">{quantity}</td>

                    <td className="px-4 py-4">
                      {renderMoney(unitPrice, record.currency)}
                    </td>

                    <td className="px-4 py-4">
                      {renderMoney(subtotal, record.currency)}
                    </td>

                    <td className="px-4 py-4">
                      {String(
                        item.tax_treatment ||
                          item.vat_treatment ||
                          "STANDARD_VAT",
                      )
                        .replaceAll("_", " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                    </td>

                    <td className="px-4 py-4">
                      {Number(
                        item.tax_percentage ?? item.vat_percentage ?? 0,
                      ).toFixed(2)}
                      %
                    </td>

                    <td className="px-4 py-4">
                      {renderMoney(item.tax_amount, record.currency)}
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {renderMoney(item.line_total, record.currency)}
                    </td>

                    <td className="px-4 py-4">
                      {item.gl_account_name || displayValue(item.gl_account)}
                    </td>
                  </tr>
                );
              })}

              {!items.length ? (
                <tr>
                  <td
                    colSpan="9"
                    className="p-10 text-center text-muted-foreground"
                  >
                    <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    No credit items were returned by the API. Refresh this page
                    once; the backend now repairs return-generated credits by
                    copying their Supplier Return items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DetailSection>

      <DetailSection title={`Applications (${applications.length})`}>
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Bill",
                  "Due Date",
                  "Open Balance",
                  "Applied Amount",
                  "Created At",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {applications.map((item, index) => (
                <tr
                  key={item.id || `${item.bill}-${index}`}
                  className="border-b"
                >
                  <td className="px-4 py-4">
                    {item.bill_number || displayValue(item.bill)}
                  </td>

                  <td className="px-4 py-4">{renderDate(item.due_date)}</td>

                  <td className="px-4 py-4">
                    {renderMoney(item.open_balance, record.currency)}
                  </td>

                  <td className="px-4 py-4 font-semibold">
                    {renderMoney(item.amount, record.currency)}
                  </td>

                  <td className="px-4 py-4">{renderDate(item.created_at)}</td>
                </tr>
              ))}

              {!applications.length ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-10 text-center text-muted-foreground"
                  >
                    No planned bill application was returned. The backend now
                    links eligible open bills from the same supplier and
                    Purchase Order before approval.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DetailSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection title="Notes">
          <div className="min-h-24 whitespace-pre-wrap text-sm">
            {record.notes || "No notes added."}
          </div>
        </DetailSection>

        <DetailSection title="Internal Memo">
          <div className="min-h-24 whitespace-pre-wrap text-sm">
            {record.internal_memo || "No internal memo added."}
          </div>
        </DetailSection>
      </div>

      <DetailSection title="Audit Information">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField
            label="Approved By"
            value={record.approved_by_name || displayUser(record.approved_by)}
          />

          <DetailField
            label="Approval Date"
            value={renderDate(record.approval_date)}
          />

          <DetailField label="Posted At" value={renderDate(record.posted_at)} />

          <DetailField
            label="Created By"
            value={record.created_by_name || displayUser(record.created_by)}
          />

          <DetailField
            label="Created At"
            value={renderDate(record.created_at)}
          />

          <DetailField
            label="Updated By"
            value={record.updated_by_name || displayUser(record.updated_by)}
          />

          <DetailField
            label="Updated At"
            value={renderDate(record.updated_at)}
          />

          <DetailField
            label="Posted By"
            value={record.posted_by_name || displayUser(record.posted_by)}
          />

          <DetailField label="Posted At" value={renderDate(record.posted_at)} />

          <DetailField
            label="Voided By"
            value={record.voided_by_name || displayUser(record.voided_by)}
          />

          <DetailField label="Voided At" value={renderDate(record.voided_at)} />
        </div>
      </DetailSection>

      <DetailSection title={`Attachments (${attachments.length})`}>
        <AttachmentList attachments={attachments} />
      </DetailSection>
    </div>
  );
}
