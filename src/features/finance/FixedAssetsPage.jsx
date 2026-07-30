import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import api, { getApiErrorDetails } from "@/lib/api";
import { useActiveBranchFilter } from "@/hooks/useActiveBranchFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, Modal, Field, Stat } from "./FinanceSectionUI";
import { extractRows, money, today } from "./accountingUtils";

const blankAsset = {
  branch: "",
  asset_code: `FA-${Date.now().toString().slice(-5)}`,
  name: "",
  category: "Computer Equipment",
  purchase_date: today(),
  purchase_cost: "",
  custodian: "",
  supplier_invoice_reference: "",
  residual_value: "0",
  useful_life_months: "60",
  depreciation_method: "STRAIGHT_LINE",
  depreciation_start_rule: "PURCHASE_DATE",
  depreciation_start_date: today(),
  production_capacity: "",
  accumulated_depreciation: "0",
  allow_branch_transfer: true,
  tag_retired: false,
  capitalization_threshold: "2000",
  notes: "",
  status: "ACTIVE",
};
const blankRun = {
  period: today().slice(0, 7),
  branch: "",
  run_date: today(),
  auto_post_journal: true,
  lock_period_after_posting: true,
  selected_asset_ids: [],
};
const blankDisposal = {
  branch: "",
  asset: "",
  disposal_date: today(),
  disposal_method: "SOLD",
  sale_proceeds: "0",
  buyer_or_recipient: "",
  reference: "",
  notes: "",
  retire_tag: true,
  auto_post_journal: true,
};
export default function FixedAssetsPage() {
  const qc = useQueryClient();
  const { branchId, branchParams } = useActiveBranchFilter();
  const [tab, setTab] = React.useState("register"),
    [modal, setModal] = React.useState(null),
    [asset, setAsset] = React.useState(blankAsset),
    [run, setRun] = React.useState(blankRun),
    [disposal, setDisposal] = React.useState(blankDisposal);
  React.useEffect(() => {
    if (branchId) {
      setAsset((v) => ({ ...v, branch: String(branchId) }));
      setRun((v) => ({ ...v, branch: String(branchId) }));
      setDisposal((v) => ({ ...v, branch: String(branchId) }));
    }
  }, [branchId]);
  const assetsQ = useQuery({
    queryKey: ["fixed-assets", branchId],
    queryFn: () =>
      api.get("/finance/fixed-assets/", {
        params: { ...branchParams, page_size: 1000 },
      }),
    staleTime: 0,
  });

  const runsQ = useQuery({
    queryKey: ["asset-depreciation", branchId],
    queryFn: () =>
      api.get("/finance/asset-depreciation-runs/", {
        params: { ...branchParams, page_size: 1000 },
      }),
    staleTime: 0,
  });

  const dispQ = useQuery({
    queryKey: ["asset-disposals", branchId],
    queryFn: () =>
      api.get("/finance/asset-disposals/", {
        params: { ...branchParams, page_size: 1000 },
      }),
    staleTime: 0,
  });

  const branchesQ = useQuery({
    queryKey: ["fixed-asset-branches"],
    queryFn: () =>
      api.get("/branches/", {
        params: { page_size: 500, ordering: "branch_name" },
      }),
    staleTime: 60000,
  });

  const assets = extractRows(assetsQ.data);
  const runs = extractRows(runsQ.data);
  const disposals = extractRows(dispQ.data);
  const branches = extractRows(branchesQ.data);
  const selected = assets.find((a) => String(a.id) === String(disposal.asset));

  const depreciationAssets = React.useMemo(() => {
    const scoped = assets.filter((item) => {
      if (item.status !== "ACTIVE") return false;
      if (run.branch && String(item.branch) !== String(run.branch))
        return false;
      return true;
    });

    return scoped.map((item) => {
      const opening = Number(item.book_value || 0);
      const residual = Number(item.residual_value || 0);
      const cost = Number(item.purchase_cost || 0);
      const months = Math.max(1, Number(item.useful_life_months || 1));
      const method = item.depreciation_method;

      let depreciation = 0;

      if (method === "DECLINING") {
        const annualRate = 20 / 100;
        depreciation = (opening * annualRate) / 12;
      } else if (method === "UNITS_OF_PRODUCTION") {
        depreciation = 0;
      } else {
        depreciation = Math.max(0, cost - residual) / months;
      }

      depreciation = Math.max(
        0,
        Math.min(depreciation, Math.max(0, opening - residual)),
      );

      return {
        ...item,
        opening_book_value: opening,
        depreciation_amount: depreciation,
        closing_book_value: Math.max(residual, opening - depreciation),
        is_fully_depreciated: opening <= residual || depreciation <= 0,
      };
    });
  }, [assets, run.branch]);

  React.useEffect(() => {
    if (modal !== "run") return;

    setRun((current) => {
      if (current.selected_asset_ids.length) {
        return current;
      }

      return {
        ...current,
        selected_asset_ids: depreciationAssets
          .filter((item) => !item.is_fully_depreciated)
          .map((item) => item.id),
      };
    });
  }, [modal, depreciationAssets]);

  const selectedDepreciationAssets = depreciationAssets.filter(
    (item) =>
      run.selected_asset_ids.includes(item.id) && !item.is_fully_depreciated,
  );

  const depreciationTotal = selectedDepreciationAssets.reduce(
    (sum, item) => sum + Number(item.depreciation_amount || 0),
    0,
  );

  const disposalGainOrLoss = selected
    ? Number(disposal.sale_proceeds || 0) - Number(selected.book_value || 0)
    : 0;
  const save = useMutation({
    mutationFn: ({ url, payload }) =>
      api.post(url, payload, { skipGlobalErrorToast: true }),
    onSuccess: async (_, v) => {
      await qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey.some(
            (k) =>
              String(k).startsWith("asset") || String(k) === "fixed-assets",
          ),
      });
      await Promise.all([assetsQ.refetch(), runsQ.refetch(), dispQ.refetch()]);
      toast.success(v.message);
      setModal(null);
    },
    onError: (e) => {
      const d = getApiErrorDetails(e);
      toast.error(d.title || "Unable to save", {
        description: d.summary || d.message,
      });
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fixed Assets"
        subtitle="Asset register, depreciation schedule, and disposals."
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "register", label: "Asset Register" },
          { value: "depreciation", label: "Depreciation Schedule" },
          { value: "disposals", label: "Disposals" },
        ]}
      />
      {tab === "register" && (
        <>
          <div className="flex justify-end">
            <Button
              className="bg-slate-900 text-white"
              onClick={() => setModal("asset")}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Asset
            </Button>
          </div>
          <Table
            headers={[
              "Tag No.",
              "Asset",
              "Category",
              "Purchase Date",
              "Cost",
              "Method",
              "Accum. Depr.",
              "Net Book Value",
            ]}
            rows={assets.map((a) => [
              a.asset_code,
              a.name,
              a.category,
              a.purchase_date,
              money(a.purchase_cost),
              a.depreciation_method,
              money(a.accumulated_depreciation),
              money(a.book_value),
            ])}
          />
        </>
      )}
      {tab === "depreciation" && (
        <>
          <div className="flex justify-end">
            <Button
              className="bg-slate-900 text-white"
              onClick={() => setModal("run")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Run Depreciation
            </Button>
          </div>
          <Table
            headers={[
              "Period",
              "Branch",
              "Run Date",
              "Assets",
              "Total Depreciation",
              "Status",
            ]}
            rows={runs.map((r) => [
              r.period,
              r.branch_name || "All branches",
              r.run_date,
              r.lines?.length || 0,
              money(r.total_depreciation),
              r.status,
            ])}
          />
        </>
      )}
      {tab === "disposals" && (
        <>
          <div className="flex justify-end">
            <Button
              className="bg-slate-900 text-white"
              onClick={() => setModal("dispose")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Disposal
            </Button>
          </div>
          <Table
            headers={[
              "Tag No.",
              "Asset",
              "Disposal Date",
              "NBV at Disposal",
              "Sale Proceeds",
              "Gain / (Loss)",
            ]}
            rows={disposals.map((d) => [
              d.asset_code,
              d.asset_name,
              d.disposal_date,
              money(d.net_book_value),
              money(d.sale_proceeds),
              money(d.gain_or_loss),
            ])}
          />
        </>
      )}
      <Modal
        open={modal === "asset"}
        onClose={() => setModal(null)}
        title="New Asset"
        eyebrow="Finance & Accounting · Fixed Assets"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModal(null)}
            >
              Save as Draft
            </Button>

            <Button
              type="button"
              className="bg-slate-900 text-white hover:bg-slate-800"
              onClick={() =>
                save.mutate({
                  url: "/finance/fixed-assets/",
                  payload: {
                    ...asset,
                    branch: Number(asset.branch),
                    purchase_cost: Number(asset.purchase_cost),
                    residual_value: Number(asset.residual_value || 0),
                    useful_life_months: Number(asset.useful_life_months),
                    accumulated_depreciation: Number(
                      asset.accumulated_depreciation || 0,
                    ),
                    capitalization_threshold: Number(
                      asset.capitalization_threshold || 0,
                    ),
                    production_capacity: asset.production_capacity
                      ? Number(asset.production_capacity)
                      : null,
                    depreciation_start_date:
                      asset.depreciation_start_rule === "CUSTOM_DATE"
                        ? asset.depreciation_start_date
                        : asset.purchase_date,
                  },
                  message: "Asset added to register.",
                })
              }
            >
              Add to Register
            </Button>
          </>
        }
      >
        <section className="border-b p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700">
              01
            </span>
            <h3 className="text-lg font-semibold">Asset identity</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Tag No." required>
              <Input
                value={asset.asset_code}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    asset_code: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Asset Name" required className="md:col-span-2">
              <Input
                placeholder="e.g. HP LaserJet printers (4 units)"
                value={asset.name}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Category" required>
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={asset.category}
                onChange={(event) => {
                  const category = event.target.value;

                  const defaults = {
                    "Computer Equipment": {
                      useful_life_months: "60",
                      capitalization_threshold: "2000",
                    },
                    "Furniture & Fixtures": {
                      useful_life_months: "84",
                      capitalization_threshold: "2000",
                    },
                    Vehicles: {
                      useful_life_months: "60",
                      capitalization_threshold: "5000",
                    },
                    "Tools & Equipment": {
                      useful_life_months: "60",
                      capitalization_threshold: "2000",
                    },
                    Buildings: {
                      useful_life_months: "240",
                      capitalization_threshold: "10000",
                    },
                    "Office Equipment": {
                      useful_life_months: "60",
                      capitalization_threshold: "2000",
                    },
                  };

                  setAsset((current) => ({
                    ...current,
                    category,
                    ...(defaults[category] || {}),
                  }));
                }}
              >
                <option value="Computer Equipment">Computer Equipment</option>
                <option value="Furniture & Fixtures">
                  Furniture & Fixtures
                </option>
                <option value="Vehicles">Vehicles</option>
                <option value="Tools & Equipment">Tools & Equipment</option>
                <option value="Office Equipment">Office Equipment</option>
                <option value="Buildings">Buildings</option>
                <option value="Other">Other</option>
              </select>
            </Field>

            <Field label="Purchase Date" required>
              <Input
                type="date"
                value={asset.purchase_date}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    purchase_date: event.target.value,
                    depreciation_start_date:
                      current.depreciation_start_rule === "PURCHASE_DATE"
                        ? event.target.value
                        : current.depreciation_start_date,
                  }))
                }
              />
            </Field>

            <Field label="Cost (AED)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={asset.purchase_cost}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    purchase_cost: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Branch / Location" required>
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={asset.branch}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    branch: event.target.value,
                  }))
                }
              >
                <option value="">Select branch</option>

                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name || branch.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Custodian">
              <Input
                placeholder="e.g. IT Department"
                value={asset.custodian}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    custodian: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Supplier / Invoice Ref.">
              <Input
                placeholder="e.g. BILL-2209"
                value={asset.supplier_invoice_reference}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    supplier_invoice_reference: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <div className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-sm text-green-800">
            {Number(asset.purchase_cost || 0) >=
            Number(asset.capitalization_threshold || 0)
              ? `✓ Above the AED ${Number(
                  asset.capitalization_threshold || 0,
                ).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} capitalization threshold for ${asset.category} — this will be recorded as a fixed asset.`
              : `The cost is below the AED ${Number(
                  asset.capitalization_threshold || 0,
                ).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} capitalization threshold. Review whether it should be expensed instead.`}
          </div>
        </section>

        <section className="border-b p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700">
              02
            </span>
            <h3 className="text-lg font-semibold">Depreciation</h3>
          </div>

          <Field label="Method" required>
            <div className="flex flex-wrap gap-2">
              {[
                ["STRAIGHT_LINE", "Straight-line"],
                ["DECLINING", "Reducing balance"],
                ["UNITS_OF_PRODUCTION", "Units-of-production"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setAsset((current) => ({
                      ...current,
                      depreciation_method: value,
                    }))
                  }
                  className={`rounded-full border px-4 py-2 text-sm ${
                    asset.depreciation_method === value
                      ? "bg-slate-900 text-white"
                      : "bg-background text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <div className="mt-5 grid gap-4 rounded-xl border p-4 md:grid-cols-3">
            <Field label="Useful Life (Years)" required>
              <Input
                type="number"
                min="1"
                step="1"
                value={Math.max(
                  1,
                  Math.round(Number(asset.useful_life_months || 0) / 12),
                )}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    useful_life_months: String(
                      Number(event.target.value || 0) * 12,
                    ),
                  }))
                }
              />
            </Field>

            <Field label="Residual Value (AED)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={asset.residual_value}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    residual_value: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Depreciation Start">
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={asset.depreciation_start_rule}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    depreciation_start_rule: event.target.value,
                    depreciation_start_date:
                      event.target.value === "PURCHASE_DATE"
                        ? current.purchase_date
                        : current.depreciation_start_date,
                  }))
                }
              >
                <option value="PURCHASE_DATE">Date of purchase</option>
                <option value="NEXT_MONTH">First day of next month</option>
                <option value="CUSTOM_DATE">Custom date</option>
              </select>
            </Field>

            {asset.depreciation_start_rule === "CUSTOM_DATE" && (
              <Field label="Custom Depreciation Start" required>
                <Input
                  type="date"
                  value={asset.depreciation_start_date}
                  onChange={(event) =>
                    setAsset((current) => ({
                      ...current,
                      depreciation_start_date: event.target.value,
                    }))
                  }
                />
              </Field>
            )}

            {asset.depreciation_method === "UNITS_OF_PRODUCTION" && (
              <Field label="Expected Production Capacity" required>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={asset.production_capacity}
                  onChange={(event) =>
                    setAsset((current) => ({
                      ...current,
                      production_capacity: event.target.value,
                    }))
                  }
                />
              </Field>
            )}

            <Field label="Capitalization Threshold (AED)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={asset.capitalization_threshold}
                onChange={(event) =>
                  setAsset((current) => ({
                    ...current,
                    capitalization_threshold: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          {(() => {
            const cost = Number(asset.purchase_cost || 0);
            const residual = Number(asset.residual_value || 0);
            const months = Math.max(1, Number(asset.useful_life_months || 1));
            const base = Math.max(0, cost - residual);
            const annual = base / (months / 12);
            const monthly = base / months;
            const yearOne = Math.max(residual, cost - annual);

            return (
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <Stat label="Depreciable Base" value={money(base)} />
                <Stat label="Annual Depreciation" value={money(annual)} />
                <Stat label="Monthly Depreciation" value={money(monthly)} />
                <Stat label="Net Book Value, Year 1" value={money(yearOne)} />
              </div>
            );
          })()}
        </section>

        <section className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700">
              03
            </span>
            <h3 className="text-lg font-semibold">Tagging & transfer</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            <div className="rounded-xl border p-4 text-center">
              <div className="mx-auto grid h-24 w-24 grid-cols-8 gap-0.5 bg-white p-2">
                {Array.from({ length: 64 }).map((_, index) => (
                  <span
                    key={index}
                    className={
                      (index * 7 + (index % 5)) % 3 === 0
                        ? "bg-black"
                        : "bg-white"
                    }
                  />
                ))}
              </div>

              <p className="mt-3 font-mono font-semibold">
                {asset.asset_code || "Asset tag"}
              </p>

              <p className="mt-1 truncate text-xs text-muted-foreground">
                {asset.name || "New fixed asset"}
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">
                A barcode / QR tag is generated automatically for physical
                verification during audits and stock takes.
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-4 w-fit"
                onClick={() => window.print()}
              >
                Print asset tag
              </Button>
            </div>
          </div>

          <label className="mt-6 flex items-start justify-between gap-4 border-t pt-5">
            <span>
              <span className="block font-medium">Allow branch transfer</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Allows the asset to be reassigned to another branch while
                retaining its net book value and depreciation history.
              </span>
            </span>

            <input
              type="checkbox"
              className="mt-1 h-5 w-5"
              checked={asset.allow_branch_transfer}
              onChange={(event) =>
                setAsset((current) => ({
                  ...current,
                  allow_branch_transfer: event.target.checked,
                }))
              }
            />
          </label>

          <Field label="Notes" className="mt-5">
            <textarea
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
              placeholder="Condition, serial number, warranty, or internal notes"
              value={asset.notes}
              onChange={(event) =>
                setAsset((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </Field>
        </section>
      </Modal>
      <Modal
        open={modal === "run"}
        onClose={() => setModal(null)}
        title="Run Depreciation"
        eyebrow="Finance & Accounting · Fixed Assets · Depreciation Schedule"
        subtitle="Calculate depreciation for active assets in the selected period. Review the preview before confirming."
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {selectedDepreciationAssets.length} asset(s) will be depreciated
              for {money(depreciationTotal)}.
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModal(null)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={
                  save.isPending ||
                  !run.period ||
                  !run.run_date ||
                  !selectedDepreciationAssets.length
                }
                className="bg-slate-900 text-white hover:bg-slate-800 disabled:text-white/70"
                onClick={() =>
                  save.mutate({
                    url: "/finance/asset-depreciation-runs/calculate/",
                    payload: {
                      period: run.period,
                      branch: run.branch ? Number(run.branch) : null,
                      run_date: run.run_date,
                      auto_post_journal: Boolean(run.auto_post_journal),
                      lock_period_after_posting: Boolean(
                        run.lock_period_after_posting,
                      ),
                      selected_asset_ids: selectedDepreciationAssets.map(
                        (item) => item.id,
                      ),
                    },
                    message: "Depreciation run completed.",
                  })
                }
              >
                Confirm & Run Depreciation
              </Button>
            </div>
          </div>
        }
      >
        <section className="border-b p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700">
              01
            </span>
            <h3 className="text-lg font-semibold">Run parameters</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Period" required>
              <Input
                type="month"
                value={run.period}
                onChange={(event) =>
                  setRun((current) => ({
                    ...current,
                    period: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Branch Scope">
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={run.branch}
                onChange={(event) =>
                  setRun((current) => ({
                    ...current,
                    branch: event.target.value,
                    selected_asset_ids: [],
                  }))
                }
              >
                <option value="">All branches</option>

                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name || branch.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Run Date" required>
              <Input
                type="date"
                value={run.run_date}
                onChange={(event) =>
                  setRun((current) => ({
                    ...current,
                    run_date: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Stat label="Assets in Scope" value={depreciationAssets.length} />
            <Stat
              label="Selected for Run"
              value={selectedDepreciationAssets.length}
            />
            <Stat
              label="Fully Depreciated"
              value={
                depreciationAssets.filter((item) => item.is_fully_depreciated)
                  .length
              }
            />
            <Stat label="Total Depreciation" value={money(depreciationTotal)} />
          </div>
        </section>

        <section className="border-b p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700">
                02
              </span>
              <h3 className="text-lg font-semibold">Depreciation preview</h3>
            </div>

            <span className="text-sm text-muted-foreground">
              Untick an asset to exclude it from this run
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-3 text-left"></th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">
                    Asset
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">
                    Method
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase">
                    Opening NBV
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase">
                    This Period
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase">
                    Closing NBV
                  </th>
                </tr>
              </thead>

              <tbody>
                {depreciationAssets.map((item) => {
                  const checked = run.selected_asset_ids.includes(item.id);

                  return (
                    <tr key={item.id} className="border-b">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={item.is_fully_depreciated}
                          onChange={(event) =>
                            setRun((current) => ({
                              ...current,
                              selected_asset_ids: event.target.checked
                                ? [...current.selected_asset_ids, item.id]
                                : current.selected_asset_ids.filter(
                                    (assetId) => assetId !== item.id,
                                  ),
                            }))
                          }
                        />
                      </td>

                      <td className="px-3 py-3">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.asset_code}
                        </p>
                      </td>

                      <td className="px-3 py-3">
                        {item.is_fully_depreciated
                          ? "Fully depreciated"
                          : item.depreciation_method_display ||
                            item.depreciation_method}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {money(item.opening_book_value)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {money(item.depreciation_amount)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {money(item.closing_book_value)}
                      </td>
                    </tr>
                  );
                })}

                {!depreciationAssets.length && (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-10 text-center text-muted-foreground"
                    >
                      No active assets found for the selected branch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end border-t pt-4 text-sm font-semibold">
            Total for {run.period || "selected period"}:{" "}
            <span className="ml-2">{money(depreciationTotal)}</span>
          </div>
        </section>

        <section className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700">
              03
            </span>
            <h3 className="text-lg font-semibold">Posting options</h3>
          </div>

          <div className="space-y-1">
            <Toggle
              label="Auto-post journal entry"
              checked={run.auto_post_journal}
              onChange={(value) =>
                setRun((current) => ({
                  ...current,
                  auto_post_journal: value,
                }))
              }
            />

            <Toggle
              label="Lock period after posting"
              checked={run.lock_period_after_posting}
              onChange={(value) =>
                setRun((current) => ({
                  ...current,
                  lock_period_after_posting: value,
                }))
              }
            />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Journal Entry Preview
            </p>

            <div className="rounded-xl border border-dashed bg-muted/20 p-4 font-mono text-sm">
              <p>
                JV-{String(run.period || "").replace("-", "")}-DEP · SYSTEM ·
                DEPRECIATION FOR {run.period || "SELECTED PERIOD"}
              </p>
              <p className="mt-3">
                Dr&nbsp;&nbsp;Depreciation Expense
                <span className="float-right">{money(depreciationTotal)}</span>
              </p>
              <p>
                Cr&nbsp;&nbsp;Accumulated Depreciation
                <span className="float-right">{money(depreciationTotal)}</span>
              </p>
            </div>
          </div>
        </section>
      </Modal>

      <Modal
        open={modal === "dispose"}
        onClose={() => setModal(null)}
        title="Record Disposal"
        eyebrow="Finance & Accounting · Fixed Assets · Disposals"
        subtitle="Remove an asset from the active register and calculate the gain or loss on disposal."
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              This removes the asset from the active register once recorded.
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModal(null)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={
                  save.isPending ||
                  !disposal.asset ||
                  !disposal.branch ||
                  !disposal.disposal_date
                }
                className="bg-slate-900 text-white hover:bg-slate-800 disabled:text-white/70"
                onClick={() =>
                  save.mutate({
                    url: "/finance/asset-disposals/",
                    payload: {
                      branch: Number(disposal.branch),
                      asset: Number(disposal.asset),
                      disposal_date: disposal.disposal_date,
                      disposal_method: disposal.disposal_method,
                      sale_proceeds:
                        disposal.disposal_method === "SOLD"
                          ? Number(disposal.sale_proceeds || 0)
                          : 0,
                      buyer_or_recipient: disposal.buyer_or_recipient,
                      reference: disposal.reference,
                      notes: disposal.notes,
                      retire_tag: Boolean(disposal.retire_tag),
                      auto_post_journal: Boolean(disposal.auto_post_journal),
                    },
                    message: "Asset disposal recorded.",
                  })
                }
              >
                Record Disposal
              </Button>
            </div>
          </div>
        }
      >
        <section className="border-b p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700">
              01
            </span>
            <h3 className="text-lg font-semibold">Select asset</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Asset" required>
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={disposal.asset}
                onChange={(event) => {
                  const assetId = event.target.value;
                  const assetItem = assets.find(
                    (item) => String(item.id) === String(assetId),
                  );

                  setDisposal((current) => ({
                    ...current,
                    asset: assetId,
                    branch: assetItem?.branch
                      ? String(assetItem.branch)
                      : current.branch,
                  }));
                }}
              >
                <option value="">Select asset</option>

                {assets
                  .filter((item) => item.status === "ACTIVE")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.asset_code} — {item.name}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Disposal Date" required>
              <Input
                type="date"
                value={disposal.disposal_date}
                onChange={(event) =>
                  setDisposal((current) => ({
                    ...current,
                    disposal_date: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          {selected && (
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <Stat
                label="Original Cost"
                value={money(selected.purchase_cost)}
              />
              <Stat
                label="Accum. Depreciation"
                value={money(selected.accumulated_depreciation)}
              />
              <Stat label="Net Book Value" value={money(selected.book_value)} />
              <Stat label="Tag No." value={selected.asset_code} />
            </div>
          )}
        </section>

        <section className="border-b p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700">
              02
            </span>
            <h3 className="text-lg font-semibold">Disposal details</h3>
          </div>

          <Field label="Disposal Method" required>
            <div className="flex flex-wrap gap-2">
              {[
                ["SOLD", "Sold"],
                ["SCRAPPED", "Scrapped"],
                ["WRITTEN_OFF", "Written off / lost / damaged"],
                ["TRANSFERRED", "Transferred out"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setDisposal((current) => ({
                      ...current,
                      disposal_method: value,
                      sale_proceeds:
                        value === "SOLD" ? current.sale_proceeds : "0",
                    }))
                  }
                  className={`rounded-full border px-4 py-2 text-sm ${
                    disposal.disposal_method === value
                      ? "bg-slate-900 text-white"
                      : "bg-background text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field
              label="Sale Proceeds (AED)"
              required={disposal.disposal_method === "SOLD"}
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                disabled={disposal.disposal_method !== "SOLD"}
                value={disposal.sale_proceeds}
                onChange={(event) =>
                  setDisposal((current) => ({
                    ...current,
                    sale_proceeds: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Buyer / Recipient">
              <Input
                placeholder="e.g. Customer or receiving company"
                value={disposal.buyer_or_recipient}
                onChange={(event) =>
                  setDisposal((current) => ({
                    ...current,
                    buyer_or_recipient: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Reference / Invoice No.">
              <Input
                placeholder="e.g. Sales receipt number"
                value={disposal.reference}
                onChange={(event) =>
                  setDisposal((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <Field label="Notes" className="mt-4">
            <textarea
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
              placeholder="Reason for disposal and condition of the asset"
              value={disposal.notes}
              onChange={(event) =>
                setDisposal((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </Field>
        </section>

        <section className="border-b p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700">
              03
            </span>
            <h3 className="text-lg font-semibold">Gain / loss on disposal</h3>
          </div>

          <div
            className={`rounded-xl p-5 ${
              disposalGainOrLoss >= 0
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>
                {disposalGainOrLoss >= 0
                  ? "Gain on Disposal"
                  : "Loss on Disposal"}
              </span>

              <span>{money(Math.abs(disposalGainOrLoss))}</span>
            </div>
          </div>

          {selected && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Journal Entry Preview
              </p>

              <div className="rounded-xl border border-dashed bg-muted/20 p-4 font-mono text-sm">
                <p>
                  JV-DISP-{selected.asset_code} · SYSTEM · DISPOSAL OF{" "}
                  {selected.asset_code}
                </p>
                <p className="mt-3">
                  Dr&nbsp;&nbsp;Cash / Bank (proceeds)
                  <span className="float-right">
                    {money(disposal.sale_proceeds)}
                  </span>
                </p>
                <p>
                  Dr&nbsp;&nbsp;Accumulated Depreciation
                  <span className="float-right">
                    {money(selected.accumulated_depreciation)}
                  </span>
                </p>
                <p>
                  Cr&nbsp;&nbsp;Fixed Assets (cost)
                  <span className="float-right">
                    {money(selected.purchase_cost)}
                  </span>
                </p>
                {disposalGainOrLoss < 0 ? (
                  <p>
                    Dr&nbsp;&nbsp;Loss on Disposal
                    <span className="float-right">
                      {money(Math.abs(disposalGainOrLoss))}
                    </span>
                  </p>
                ) : (
                  <p>
                    Cr&nbsp;&nbsp;Gain on Disposal
                    <span className="float-right">
                      {money(disposalGainOrLoss)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-700">
              04
            </span>
            <h3 className="text-lg font-semibold">Options</h3>
          </div>

          <div className="space-y-1">
            <Toggle
              label="Retire tag & QR code"
              checked={disposal.retire_tag}
              onChange={(value) =>
                setDisposal((current) => ({
                  ...current,
                  retire_tag: value,
                }))
              }
            />

            <Toggle
              label="Auto-post journal entry"
              checked={disposal.auto_post_journal}
              onChange={(value) =>
                setDisposal((current) => ({
                  ...current,
                  auto_post_journal: value,
                }))
              }
            />
          </div>
        </section>
      </Modal>
    </div>
  );
}
function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-xl border p-4">
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              {r.map((v, j) => (
                <td key={j} className="px-4 py-3">
                  {v ?? "—"}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td
                colSpan={headers.length}
                className="p-10 text-center text-muted-foreground"
              >
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
