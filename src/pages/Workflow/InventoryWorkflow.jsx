const fitsBottle = (material, sizeId) => !!material && (!(material.compatibleBottleSizes || []).length || material.compatibleBottleSizes.includes(sizeId));

import React, { useEffect, useState, useRef } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { apiClient as api } from "../../api/client";
import { toast } from "sonner";
import {useUnsavedChanges} from "../../hooks/useUnsavedChanges";
import {ErrorState,LoadingSkeleton} from "../../components/common/StatCard";
import {Can} from '../../components/common/Can';
import { useAuth } from "../../context/AuthContext";
import { BottleSizeMaster } from "../Production/BottleSizeMaster";

const box = "erp-panel p-5 space-y-4";
const button =
  "erp-primary";
const input = "erp-input";
const packagingTypes = [
  "Packaging",
  "Bottle",
  "Pump",
  "Cap",
  "Label",
  "Pouch",
  "Carry Bag",
  "Carton",
];
function Field({ label, children, hidden }) {
  return (
    <label hidden={hidden} className="erp-field space-y-1">
      <span className="erp-field-label">{label}</span>
      {children}
    </label>
  );
}
function Text({ label, value, onChange, type = "text", hidden, ...rest }) {
  const automatic=/^(?:.* Code|Unique SKU)$/i.test(label||'');
  if(automatic){rest={...rest,readOnly:true,required:false,placeholder:'Auto-generated on Save'}}
  return (
    <Field label={label} hidden={hidden}>
      <input
        aria-label={label}
        className={input}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </Field>
  );
}
function Select({ label, value, onChange, items, hidden }) {
  return (
    <Field label={label} hidden={hidden}>
      <select
        aria-label={label}
        className={input}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {items.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
const statuses = [
  { id: "active", name: "Active" },
  { id: "inactive", name: "Inactive" },
];
const emptyVariant = () => ({
  plannedQuantity: "1",
  sku: "",
  bottleSizeId: "",
  concentrationId: "",
  fillVolumeMl: "",
  sellingPrice: "",
  additionalCost: "0",
  minStock: "5",
  status: "active",
  packaging: [],
});
function automaticPackaging(size, materials) {
  if (!size) return {packaging:[],error:"Choose a bottle size."};
  const refs=[size.bottleMaterialRef];
  for (const kind of ["pump","cap"]) {
    const candidates=materials.filter(m=>m.categoryType==="Packaging" && m.status==="active" && m.unit==="pcs" && `${m.category} ${m.name}`.toLowerCase().includes(kind) && fitsBottle(m,size.id));
    const ref=size[`${kind}MaterialRef`] || (candidates.length===1 ? candidates[0].id : null);
    const mat=materials.find(m=>m.id===ref);
    if (!mat || mat.status!=="active" || !fitsBottle(mat,size.id)) return {packaging:[],error:`Set an active compatible default ${kind} in Bottle Setup.`};
    refs.push(ref);
  }
  if (new Set(refs).size!==3) return {packaging:[],error:"Choose distinct bottle, pump and cap defaults in Bottle Setup."};
  return {packaging:refs.map(materialId=>({materialId,qty:1})),error:""};
}
function RecipeTable({ rows, multiplier = 1, availability }) {
  return (
    <div className="overflow-x-auto">
      <table className="erp-table w-full text-sm">
        <thead>
          <tr>
            {[
              "Material",
              "Type",
              "Percentage",
              "Per bottle",
              "Total required",
              "Unit cost",
              "Cost",
            ].concat(availability ? ["Available in source"] : []).map((x) => (
              <th key={x} className="text-left p-2">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.materialId} className="border-t">
              <td className="p-2">{r.name}</td>
              <td>{r.type}</td>
              <td>{r.percentage == null ? "—" : `${Number(r.percentage)}%`}</td>
              <td>
                {Number(r.qty).toFixed(4)} {r.unit}
              </td>
              <td>
                {(Number(r.qty) * multiplier).toFixed(4)} {r.unit}
              </td>
              <td>{Number(r.rate).toFixed(2)}</td>
              <td>{(Number(r.cost) * multiplier).toFixed(2)}</td>
              {availability && <td className={Number(availability[r.materialId] || 0)<Number(r.qty)*multiplier?"text-rose-700 font-semibold":"text-emerald-700"}>{Number(availability[r.materialId] || 0).toFixed(4)} {r.unit}{Number(availability[r.materialId] || 0)<Number(r.qty)*multiplier&&" · Insufficient"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Breadcrumb() {
  return <p className="text-xs text-gray-500">Inventory / <Link to="/inventory/raw-materials">Raw Materials</Link> · <Link to="/inventory/fragrances">Fragrances</Link> · <Link to="/inventory/products">Products &amp; Formulations</Link></p>;
}

export function BottleSetup(){return <div className="space-y-4"><Breadcrumb/><h1 className="text-2xl font-bold">Bottle & Packaging Setup</h1><p>Configure bottle volume, packaging and the selling-price multiplier/surcharge. Fragrance types and their prices are configured under Fragrances or raw oils.</p><BottleSizeMaster/></div>;}
export function PercentageFormulations() {
  const [params] = useSearchParams();
  const [formulas, setFormulas] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [fragrances, setFragrances] = useState([]);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  const { hasPermission } = useAuth();
  const blank = () => ({
    code: "",
    name: "",
    fragranceId: params.get("fragranceId") || "",
    version: "v1.0",
    status: "active",
    percentageRecipe: true,
    percentageIngredients: [
      { materialId: "", percentage: "20", type: "Perfume Oil" },
      { materialId: "", percentage: "80", type: "Solvent" },
    ],
  });
  const [form, setForm] = useState(params.get("fragranceId") ? blank() : null);
  const load = async () => {
    try {
      const [a, b, c] = await Promise.all([
        api.get("/formulas/"),
        api.get("/inventory/raw-materials/"),
        api.get("/fragrances/"),
      ]);
      setFormulas(a.data);
      setMaterials(b.data);
      setFragrances(c.data);
    } catch {}
  };
  useEffect(() => {
    load();
  }, []);
  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const total = (form?.percentageIngredients || []).reduce(
    (n, r) => n + Number(r.percentage || 0),
    0,
  );
  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    const selected=form.percentageIngredients.map(row=>row.materialId);
    if(new Set(selected).size!==selected.length){toast.error("Each ingredient can appear only once. Combine its percentages into one row.");return;}
    setBusy(true);
    try {
      const response = await api[edit ? "put" : "post"](
        edit ? `/formulas/${edit}/` : "/formulas/",
        form,
      );
      setSaved(response.data);
      setForm(null);
      setEdit(null);
      await load();
      toast.success("Formulation saved");
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <Breadcrumb />
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Percentage Formulations</h1>
        {hasPermission(["inventory.formulation.create","production.formulation"]) && (
          <button
            className={button}
            onClick={() => {
              setEdit(null);
              setForm(blank());
              setSaved(null);
            }}
          >
            Create Formulation
          </button>
        )}
      </div>
      {saved && (
        <div className={box}>
          <p>{saved.name} saved.</p>
          <Link
            className={button}
            to={`/inventory/products/create?formulaId=${saved.id}&fragranceId=${saved.fragranceId}`}
          >
            Create Product
          </Link>
        </div>
      )}
      {form && (
        <form onSubmit={save} className={box}>
          <h2 className="font-bold">
            {edit ? "Edit" : "Create"} percentage recipe
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Text
              label="Formulation Code"
              value={form.code}
              onChange={(v) => change("code", v)}
              required
              maxLength={60}
            />
            <Text
              label="Formulation Name"
              value={form.name}
              onChange={(v) => change("name", v)}
              required
              maxLength={160}
            />
            <Select
              label="Fragrance"
              value={form.fragranceId}
              onChange={(v) => change("fragranceId", v)}
              items={fragrances}
            />
            <Text
              label="Version"
              value={form.version}
              onChange={(v) => change("version", v)}
              required
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(v) => change("status", v)}
              items={statuses}
            />
          </div>
          <p className="text-sm text-gray-500">Each ingredient can be selected once. Combine percentages in one row when using the same material.</p>
          {form.percentageIngredients.map((r, i) => (
            <div key={i} className="grid md:grid-cols-4 gap-3 items-end">
              <Select
                label="Ingredient Type"
                value={
                  materials.find((m) => m.id === r.materialId)?.categoryType ||
                  r.type ||
                  "Perfume Oil"
                }
                items={["Perfume Oil", "Solvent"].map((id) => ({
                  id,
                  name: id,
                }))}
                onChange={(v) =>
                  change(
                    "percentageIngredients",
                    form.percentageIngredients.map((x, j) =>
                      j === i ? { ...x, type: v, materialId: "" } : x,
                    ),
                  )
                }
              />
              <Select
                label="Ingredient"
                value={r.materialId}
                items={materials.filter(
                  (m) =>
                    m.categoryType ===
                      (materials.find((m) => m.id === r.materialId)?.categoryType ||
                        r.type ||
                        "Perfume Oil") &&
                    m.unit === "ml" &&
                    m.status === "active" &&
                    !form.percentageIngredients.some((other, index) => index !== i && other.materialId === m.id),
                )}
                onChange={(v) =>
                  change(
                    "percentageIngredients",
                    form.percentageIngredients.map((x, j) =>
                      j === i ? { ...x, materialId: v } : x,
                    ),
                  )
                }
              />
              <Text
                label="Percentage"
                type="number"
                min="0.0001"
                max="100"
                step="0.0001"
                required
                value={r.percentage}
                onChange={(v) =>
                  change(
                    "percentageIngredients",
                    form.percentageIngredients.map((x, j) =>
                      j === i ? { ...x, percentage: v } : x,
                    ),
                  )
                }
              />
              <button
                type="button"
                className={button}
                onClick={() =>
                  change(
                    "percentageIngredients",
                    form.percentageIngredients.filter((_, j) => i !== j),
                  )
                }
              >
                Remove Ingredient
              </button>
            </div>
          ))}
          <p
            className={
              Math.abs(total - 100) < 0.00001
                ? "sticky bottom-0 bg-white border-t border-gray-200 py-3 font-semibold text-green-700"
                : "sticky bottom-0 bg-white border-t border-gray-200 py-3 font-semibold text-red-700"
            }
          >
            Total: {total.toFixed(4)}% {Math.abs(total-100)<0.00001 ? "— recipe is balanced" : "— must equal 100%"}
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              className={button}
              onClick={() =>
                change("percentageIngredients", [
                  ...form.percentageIngredients,
                  { materialId: "", percentage: "", type: "Solvent" },
                ])
              }
            >
              Add Ingredient
            </button>
            <button
              className={button}
              disabled={
                busy ||
                Math.abs(total - 100) > 0.00001 ||
                new Set(form.percentageIngredients.map((r) => r.materialId))
                  .size !== form.percentageIngredients.length ||
                form.percentageIngredients.some(
                  (r) => !r.materialId || Number(r.percentage) <= 0,
                )
              }
            >
              Save Formulation
            </button>
            <button
              type="button"
              className={button}
              onClick={() => {
                setForm(null);
                setEdit(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className={box}>
        {formulas.map((f) => (
          <div
            key={f.id}
            className="flex flex-wrap justify-between gap-3 border-b py-3"
          >
            <div>
              <strong>
                {f.name || "Legacy bottle recipe"} · {f.code} {f.version}
              </strong>
              <p className="text-sm">
                {fragrances.find((x) => x.id === f.fragranceId)?.name} ·{" "}
                {f.status} ·{" "}
                {f.percentageRecipe
                  ? "Percentage recipe"
                  : "Historical bottle recipe"}
              </p>
              <details>
                <summary className="text-sm cursor-pointer">
                  View Recipe
                </summary>
                {(f.percentageIngredients || []).map((r) => (
                  <p key={r.materialId} className="text-sm">
                    {r.name} · {r.type} · {Number(r.percentage)}%
                  </p>
                ))}
                {!f.percentageRecipe &&
                  (f.ingredients || []).map((r) => (
                    <p className="text-sm" key={r.materialId}>
                      {r.name}: {r.qty} {r.unit}
                    </p>
                  ))}
              </details>
            </div>
            {f.percentageRecipe && (
              <div className="flex flex-wrap gap-2">
                <Can permission="inventory.product.create"><Link
                  className={button}
                  to={`/inventory/products/create?formulaId=${f.id}&fragranceId=${f.fragranceId}`}
                >
                  Create Product
                </Link></Can>
                {hasPermission(["inventory.formulation.edit","inventory.formulation.create","inventory.formulation.delete","production.formulation"]) && (
                  <>
                    <Can permission={["inventory.formulation.edit","production.formulation"]}><button
                      className={button}
                      onClick={() => {
                        setEdit(f.id);
                        setForm({
                          ...f,
                          percentageIngredients: f.percentageIngredients.map(
                            (r) => ({ ...r, percentage: String(r.percentage) }),
                          ),
                        });
                      }}
                    >
                      Edit
                    </button></Can>
                    <Can permission={["inventory.formulation.create","production.formulation"]}><button
                      className={button}
                      onClick={() => {
                        setEdit(null);
                        setForm({
                          ...f,
                          id: undefined,
                          version: `${f.version}-new`,
                        });
                      }}
                    >
                      New Version
                    </button></Can>
                    <Can permission={["inventory.formulation.delete","production.formulation"]}><button
                      className={button}
                      onClick={async () => {
                        if (
                          window.confirm(
                            "Delete unused formulation? Referenced recipes are protected.",
                          )
                        ) {
                          try {
                            await api.delete(`/formulas/${f.id}/`);
                            load();
                          } catch {}
                        }
                      }}
                    >
                      Delete
                    </button></Can>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
export function UnifiedProducts() {
  const [products, setProducts] = useState([]);
  const nav = useNavigate();
  const { hasPermission } = useAuth();
  const load = () =>
    api
      .get("/products/")
      .then((r) => setProducts(r.data))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="space-y-5">
      <Breadcrumb />
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Products &amp; Formulations</h1>
        {hasPermission("inventory.product.create") && (
          <Link to="/inventory/products/create" className={button}>
            Create Product &amp; Variants
          </Link>
        )}
      </div>
      <div className={box}>
        {products.map((p) => (
          <div
            key={p.id}
            className="py-3 border-b flex flex-wrap justify-between gap-2"
          >
            <div>
              <strong>{p.name}</strong>
              <p className="text-sm">
                {p.code} · {p.variantsCount} variants · Stock{" "}
                {Number(p.finishedStock)} · {p.status}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className={button}
                onClick={() => nav(`/inventory/products/${p.id}`)}
              >
                Details
              </button>
              {hasPermission("inventory.product.delete") && (
                <button
                  className={button}
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Delete unused product? Stock and transaction references are protected.",
                      )
                    ) {
                      try {
                        await api.delete(`/products/${p.id}/`);
                        load();
                      } catch {}
                    }
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function preview(formula, variant, materials) {
  const rows = (formula?.percentageIngredients || []).map((r) => {
    const m = materials.find((x) => x.id === r.materialId);
    return {
      materialId: r.materialId,
      name: m?.name || r.name,
      type: m?.categoryType || r.type,
      percentage: r.percentage,
      qty:
        Math.round(
          ((Number(variant.fillVolumeMl || 0) * Number(r.percentage)) / 100) *
            10000,
        ) / 10000,
      unit: "ml",
      rate: Number(m?.currentCost || 0),
    };
  });
  for (const r of variant.packaging || []) {
    const m = materials.find((x) => x.id === r.materialId);
    if (m)
      rows.push({
        materialId: m.id,
        name: m.name,
        type: m.categoryType,
        qty: Number(r.qty),
        unit: m.unit,
        rate: Number(m.currentCost),
      });
  }
  return rows.map((r) => ({ ...r, cost: r.qty * r.rate }));
}
export function UnifiedProductForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [step,setStep]=useState(0);
  const [reached,setReached]=useState(0);
  const [dirty,setDirty]=useState(false);
  const [loadError,setLoadError]=useState(false);
  const editor=useRef(null);

  const steps=["Product","Formulation","Variants","Packaging","Cost & pricing","Review & save"];
  const [catalog, setCatalog] = useState(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useUnsavedChanges(dirty&&!busy);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    category: "Perfume",
    status: "active",
    fragranceId: params.get("fragranceId") || "",
    formulaId: params.get("formulaId") || "",
    variants: [emptyVariant()],
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const urls = [
          "fragrances",
          "formulas",
          "bottle-sizes",
          "concentrations",
          "inventory/raw-materials",
        ];
        const data = await Promise.all(urls.map((x) => api.get(`/${x}/`)));
        if (id) {
          const { data: w } = await api.get(`/products/${id}/workspace/`);
          if (cancelled) return;
          setForm({
            ...w.product,
            formulaId: w.variants[0]?.formulaId || "",
            variants: w.variants.map((v) => ({
              ...v,
              packaging: v.packagingItems,
            })),
          });
        }
        if (cancelled) return;
        const loaded=Object.fromEntries(urls.map((x, i) => [x, data[i].data]));
        if(!id){
          const selected=loaded.formulas.find(f=>f.id===params.get("formulaId")&&f.percentageRecipe&&f.status==="active");
          const fragrance=loaded.fragrances.find(f=>f.id===(selected?.fragranceId||params.get("fragranceId")));
          const sizes=loaded["bottle-sizes"].filter(b=>b.status==="active");
          const concentrations=loaded.concentrations.filter(c=>c.status==="active");
          setForm(current=>({...current,name:current.name||fragrance?.name||selected?.name||"",fragranceId:selected?.fragranceId||current.fragranceId,formulaId:selected?.id||current.formulaId,variants:current.variants.map(v=>({...v,bottleSizeId:v.bottleSizeId||(sizes.length===1?sizes[0].id:""),concentrationId:v.concentrationId||(concentrations.length===1?concentrations[0].id:"")}))}));
        }
        setCatalog(loaded);
      } catch {setLoadError(true)}
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);
  if(loadError)return <ErrorState onRetry={()=>window.location.reload()}/>;
  if (!catalog) return <LoadingSkeleton label="Loading product setup"/>;
  const change = (k,v) => {setDirty(true);setForm(f=>({...f,[k]:v}))};
  const update = (i, k, v) => {setDirty(true);
    setForm((f) => ({
      ...f,
      variants: f.variants.map((r, j) => (i === j ? { ...r, [k]: v } : r)),
    }));};
  const formula = catalog.formulas.find((f) => f.id === form.formulaId);
  const advance=()=>{
    const controls=[...editor.current.querySelectorAll('input,select,textarea')].filter(n=>n.getClientRects().length);
    if(controls.some(n=>{if(!n.checkValidity()){n.reportValidity();return true}return false}))return;
    if(step===1&&(!form.fragranceId||!form.formulaId)){toast.error("Choose a fragrance and formulation.");return}
    if(step===2&&(!form.variants.length||form.variants.some(v=>!v.bottleSizeId||!v.concentrationId||Number(v.plannedQuantity)<1||!Number.isInteger(Number(v.plannedQuantity))))){toast.error("Complete each variant and enter a whole bottle quantity.");return}
    if(step===2&&form.variants.some(v=>(!id||!v.id)&&automaticPackaging(catalog["bottle-sizes"].find(b=>b.id===v.bottleSizeId),catalog["inventory/raw-materials"]).error)){toast.error("Set compatible pump and cap defaults in Bottle Setup first.");return}
    setStep(n=>Math.min(n+1,5));setReached(n=>Math.max(n,step+1));editor.current.scrollIntoView({block:'start',behavior:'instant'});
  };
  const save = async (e) => {
    e.preventDefault();
    if(step!==5){e.preventDefault();advance();return}
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const { data } = await api.post(
        id ? `/products/${id}/unified/` : "/products/unified/",
        {...form,variants:form.variants.map(v=>({...v,automaticPackaging:!id || !v.id,packaging:!id || !v.id ? automaticPackaging(catalog["bottle-sizes"].find(b=>b.id===v.bottleSizeId),catalog["inventory/raw-materials"]).packaging : v.packaging}))},
      );
      setDirty(false);
      toast.success("Product and variants saved");
      nav(`/inventory/products/${data.id}`);
    } catch (err) {
      toast.error(JSON.stringify(err.response?.data || "Unable to save product"));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <form ref={editor} onSubmit={save} noValidate className="space-y-5">
      <Breadcrumb />
      <h1 className="text-2xl font-bold">
        {id ? "Edit" : "Create"} Product &amp; Variants
      </h1>
      <nav aria-label="Product creation steps" className="erp-workflow-steps">{steps.map((label,n)=><button key={label} type="button" disabled={n>reached} aria-current={step===n?'step':undefined} onClick={()=>setStep(n)}><span>{n+1}</span>{label}</button>)}</nav>
      {step===5&&<section className={box}><h2>Ready to save</h2><p className="text-sm text-gray-500">Review ingredients, automatic packaging and estimated costs below. Saving creates the product definition; manufacture separately to move stock.</p><dl className="grid sm:grid-cols-3 gap-4 text-sm"><div><dt className="text-xs text-gray-500">Product</dt><dd>{form.name} · {form.code}</dd></div><div><dt className="text-xs text-gray-500">Fragrance</dt><dd>{catalog.fragrances.find(f=>f.id===form.fragranceId)?.name}</dd></div><div><dt className="text-xs text-gray-500">Formulation</dt><dd>{formula?.name}</dd></div></dl></section>}
      <section hidden={step>1} className={box}>
        <h2 className="font-bold">{step===0?"Product information":"Choose your formulation"}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Text
            hidden={step!==0} label="Product Name"
            required
            value={form.name}
            onChange={(v) => change("name", v)}
          />
          <Text
            hidden={step!==0} label="Product Code"
            required
            value={form.code}
            onChange={(v) => change("code", v)}
          />
          <Select
            hidden={step!==1} label="Fragrance"
            value={form.fragranceId}
            items={catalog.fragrances}
            onChange={(v) => {
              change("fragranceId", v);
              change("formulaId", "");
            }}
          />
          <Select
            hidden={step!==1} label="Formulation"
            value={form.formulaId}
            items={catalog.formulas
              .filter(
                (f) =>
                  f.fragranceId === form.fragranceId &&
                  f.percentageRecipe &&
                  f.status === "active",
              )
              .map((f) => ({ ...f, name: `${f.name} ${f.version}` }))}
            onChange={(v) => {
              const chosen=catalog.formulas.find(f=>f.id===v);
              const fragrance=catalog.fragrances.find(f=>f.id===chosen?.fragranceId);
              setDirty(true);setForm(current=>({...current,formulaId:v,fragranceId:chosen?.fragranceId||current.fragranceId,name:current.name||fragrance?.name||chosen?.name||""}));
            }}
          />
          <Text
            hidden={step!==0} label="Description"
            value={form.description}
            onChange={(v) => change("description", v)}
          />
          <Text
            hidden={step!==0} label="Product Category"
            value={form.category}
            onChange={(v) => change("category", v)}
          />
          <Select
            hidden={step!==0} label="Status"
            value={form.status}
            items={statuses}
            onChange={(v) => change("status", v)}
          />
        </div>
      </section>
      {form.variants.map((v, i) => {
        const auto=!id || !v.id;
        const size=catalog["bottle-sizes"].find(b=>b.id===v.bottleSizeId);
        const setup=auto ? automaticPackaging(size,catalog["inventory/raw-materials"]) : {packaging:v.packaging,error:""};
        const effective={...v,packaging:setup.packaging,fillVolumeMl:auto ? size?.volumeMl || "" : v.fillVolumeMl};
        const quantity=Number(v.plannedQuantity || 1);
        const rows = preview(formula, effective, catalog["inventory/raw-materials"]);
        const oil = rows
          .filter((r) => r.type === "Perfume Oil")
          .reduce((n, r) => n + r.cost, 0);
        const solvent = rows
          .filter((r) => r.type === "Solvent")
          .reduce((n, r) => n + r.cost, 0);
        const pack = rows
          .filter((r) => packagingTypes.includes(r.type))
          .reduce((n, r) => n + r.cost, 0);
        const total =
          Math.round(
            (oil +
              solvent +
              pack +
              Number(v.additionalCost || 0) +
              Number.EPSILON) *
              100,
          ) / 100;
        return (
          <section hidden={step<2} className={box} key={i}>
            <h2 className="font-bold">
              Variant {i + 1}: Size, Recipe, Packaging &amp; Pricing
            </h2>
            <div hidden={step!==2} className="grid md:grid-cols-3 gap-4">
              <Select
                label="Bottle Size"
                value={v.bottleSizeId}
                items={catalog["bottle-sizes"]}
                onChange={(value) => {
                  const b = catalog["bottle-sizes"].find((x) => x.id === value);
                  update(i, "bottleSizeId", value);
                  update(i, "fillVolumeMl", String(b?.volumeMl || ""));
                  update(i, "packaging", [
                    ...(v.packaging || []).filter(
                      (r) =>
                        fitsBottle(catalog["inventory/raw-materials"].find(m=>m.id===r.materialId),value) && !catalog["bottle-sizes"].some(
                          (x) => x.bottleMaterialRef === r.materialId,
                        ),
                    ),
                    ...(b
                      ? [{ materialId: b.bottleMaterialRef, qty: "1" }]
                      : []),
                  ]);
                }}
              />
              <Select
                label="Concentration Label"
                value={v.concentrationId}
                items={catalog.concentrations}
                onChange={(value) => update(i, "concentrationId", value)}
              />
              <Text
                label="Unique SKU"
                required
                value={v.sku}
                onChange={(value) => update(i, "sku", value)}
              />
              <Text label="Perfume Quantity (bottles)" type="number" required min="1" step="1" value={v.plannedQuantity || 1} onChange={value=>update(i,"plannedQuantity",value)}/>
              <p>Fill per bottle: {effective.fillVolumeMl || 0} ml · Total perfume: {(Number(effective.fillVolumeMl || 0)*quantity).toFixed(2)} ml</p>
              <Text
                label="Additional Production Cost"
                type="number"
                min="0"
                step="0.01"
                value={v.additionalCost}
                onChange={(value) => update(i, "additionalCost", value)}
              />
              <Text
                label="Reorder Level (bottles)"
                type="number"
                min="0"
                value={v.minStock}
                onChange={(value) => update(i, "minStock", value)}
              />
              <Select
                label="Variant Status"
                items={statuses}
                value={v.status}
                onChange={(value) => update(i, "status", value)}
              />
            </div>
            <p hidden={step!==2} className="text-sm text-gray-600">
              The concentration label describes the product. Ingredient
              percentages come from the selected formulation.
            </p>
            <div hidden={step<3} className="space-y-3">
            <h3 className="font-bold">{step===3?"Automatic packaging requirements":"Recipe, requirements & costs"}</h3>
            {setup.error && <p role="alert" className="text-red-700">{setup.error}</p>}
            <p>One piece of each per bottle. Defaults come from Bottle Setup. Saving a product plans quantities; manufacture it to deduct stock.</p>
            <h3 className="font-bold">
              Automatic Liquid Recipe &amp; Cost Preview
            </h3>
            <RecipeTable rows={step===3?rows.filter(r=>r.type==="Packaging"):rows} multiplier={quantity} />
            <p className="text-sm">
              Oil: {oil.toFixed(2)} · Solvent: {solvent.toFixed(2)} · Packaging:{" "}
              {pack.toFixed(2)} · Additional:{" "}
              {Number(v.additionalCost || 0).toFixed(2)}
            </p>
            <p className="rounded-lg bg-[var(--primary-soft)] p-4 font-semibold text-[var(--primary-hover)]">Calculated cost per perfume: {total.toFixed(2)} · Total for {quantity} perfumes: {(total*quantity).toFixed(2)}</p>
            <p className="text-sm">New products start with selling price equal to calculated unit cost. Set your retail price under product pricing after creation.</p>
            </div>
            <button
              hidden={step!==2}
              type="button"
              className="erp-secondary text-rose-700"
              onClick={() =>
                change(
                  "variants",
                  form.variants.filter((_, j) => i !== j),
                )
              }
            >
              Remove Variant
            </button>
          </section>
        );
      })}
      <div className="flex gap-3 flex-wrap sticky bottom-3 erp-panel p-4 shadow-md">
        {step>0&&<button type="button" className="erp-secondary" onClick={()=>setStep(n=>n-1)}>Previous</button>}
        {step<5&&<button type="button" className="erp-primary" onClick={advance}>Next: {steps[step+1]}</button>}
        <button
          type="button"
          className={button}
          hidden={step!==2} onClick={() => change("variants", [...form.variants, emptyVariant()])}
        >
          Add Variant
        </button>
        <button
          className={button}
          hidden={step!==5}
          disabled={busy || !form.formulaId || !form.variants.length || form.variants.some(v=>(!id || !v.id) && !!automaticPackaging(catalog["bottle-sizes"].find(b=>b.id===v.bottleSizeId),catalog["inventory/raw-materials"]).error)}
        >
          Save Product &amp; All Variants
        </button>
        <Link
          className="erp-secondary ml-auto"
          to={id ? `/inventory/products/${id}` : "/inventory/products"}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
function InlinePricing({ variant, onSaved }) {
  const [price, setPrice] = useState(String(variant.sellingPrice));
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex items-end gap-3 flex-wrap"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api.post(`/products/variants/${variant.id}/pricing/`, {
            sellingPrice: price,
          });
          toast.success("Pricing saved");
          onSaved();
        } catch {
        } finally {
          setBusy(false);
        }
      }}
    >
      <Text
        label={`Selling Price ${variant.sku}`}
        type="number"
        min="0"
        step="0.01"
        required
        value={price}
        onChange={setPrice}
      />
      <button className={button} disabled={busy}>
        Save Pricing
      </button>
    </form>
  );
}
export function ProductWorkspace() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [locations, setLocations] = useState({ warehouses: [], branches: [] });
  const [production, setProduction] = useState({
    variantId: "",
    branchId: "",
    sourceWarehouseId: "",
    finishedWarehouseId: "",
    quantity: "1",
  });
  const [availability,setAvailability]=useState(null);
  const [availabilityError,setAvailabilityError]=useState(false);
  const [stockRefresh,setStockRefresh]=useState(0);
  const [busy, setBusy] = useState(false);
  const key = useRef(null);
  const lock = useRef(false);
  const { hasPermission } = useAuth();
  const load = () =>
    api
      .get(`/products/${id}/workspace/`)
      .then((r) => {
        setData(r.data);
        setProduction((p) => ({
          ...p,
          quantity:p.variantId ? p.quantity : String(r.data.variants.find(v=>v.status==="active")?.plannedQuantity || 1),
          variantId:
            p.variantId ||
            r.data.variants.find((v) => v.status === "active")?.id ||
            "",
        }));
      })
      .catch(() => {});
  useEffect(() => {
    load();
    Promise.all([api.get("/warehouses/"), api.get("/branches/")])
      .then(([a, b]) => setLocations({ warehouses: a.data, branches: b.data }))
      .catch(() => {});
  }, [id]);
  useEffect(()=>{
    const source=locations.warehouses.find(w=>w.id===production.sourceWarehouseId);
    if(!source){setAvailability(null);return}
    let live=true;setAvailability(null);setAvailabilityError(false);
    api.get('/inventory/raw-materials/',{params:{location:source.name}}).then(({data:materials})=>{if(live)setAvailability(Object.fromEntries(materials.map(m=>[m.id,Number(m.availableStock)])))}).catch(()=>{if(live)setAvailabilityError(true)});
    return()=>{live=false};
  },[production.sourceWarehouseId,locations.warehouses,stockRefresh]);
  if (!data) return <LoadingSkeleton label="Loading product workspace"/>;
  const variant = data.variants.find((v) => v.id === production.variantId);
  const insufficient=availability&&variant?.recipe.rows.some(r=>Number(availability[r.materialId]||0)<Number(r.qty)*Number(production.quantity));
  const tabs = [
    "Overview",
    "Variants",
    "Formulation & Recipe",
    "Packaging",
    "Costing & Pricing",
    "Produce / Manufacture",
    "Stock",
    "History",
  ];
  const change = (k, v) => {
    setProduction((p) => ({ ...p, [k]: v }));
    key.current = null;
  };
  const produce = async (e) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      await api.post(`/products/${id}/manufacture/`, {
        ...production,
        requestKey: key.current,
      });
      await load();
      setStockRefresh(n=>n+1);
      toast.success("Production completed; inventory updated");
      key.current = null;
      setTab("Stock");
    } catch {
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <Breadcrumb />
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-bold">{data.product.name}</h1>
        {hasPermission("inventory.product.edit") &&
          data.variants.every((v) => v.percentageRecipe) && (
            <Link className={button} to={`/inventory/products/${id}/edit`}>
              Edit Product &amp; Pricing
            </Link>
          )}
        <button className={button} onClick={load}>
          Refresh
        </button>
      </div>
      <div role="tablist" className="erp-tabs">
        {tabs.filter(t=>t!=="Produce / Manufacture"||hasPermission(["inventory.product.manufacture","production.add_batch"])).map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            className={
              tab === t ? button : "px-3 py-2 border rounded-lg text-sm"
            }
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <section className={box}>
          <p>{data.product.description}</p>
          <p>
            Code: {data.product.code} · Category: {data.product.category} ·
            Status: {data.product.status}
          </p>
          <p>Fragrance: {data.product.fragranceName}</p>
          <p>
            {data.variants.length} variants · Available stock:{" "}
            {Number(data.product.finishedStock)} bottles
          </p>
        </section>
      )}
      {tab === "Variants" && (
        <section className={box}>
          {data.variants.map((v) => (
            <p key={v.id}>
              <strong>{v.sku}</strong> — {v.name} · Fill{" "}
              {Number(v.fillVolumeMl) || "Legacy"} ml · Planned {v.plannedQuantity || 1} bottles · Price{" "}
              {Number(v.sellingPrice).toFixed(2)} · {v.status}
            </p>
          ))}
        </section>
      )}
      {["Formulation & Recipe", "Packaging", "Costing & Pricing"].includes(
        tab,
      ) &&
        data.variants.map((v) => (
          <section className={box} key={v.id}>
            <h2 className="font-bold">
              {v.sku} — {v.name}
            </h2>
            <RecipeTable
              rows={v.recipe.rows.filter((r) =>
                tab === "Packaging"
                  ? packagingTypes.includes(r.type)
                  : tab === "Formulation & Recipe"
                    ? ["Perfume Oil", "Solvent"].includes(r.type)
                    : true,
              )}
            />
            {tab === "Costing & Pricing" && (
              <>
                <p>
                  Oil {Number(v.recipe.perfumeOilCost).toFixed(2)} · Solvent{" "}
                  {Number(v.recipe.solventCost).toFixed(2)} · Packaging{" "}
                  {Number(v.recipe.packagingCost).toFixed(2)} · Additional{" "}
                  {Number(v.recipe.additionalProductionCost).toFixed(2)} · Total{" "}
                  {Number(v.recipe.totalEstimatedUnitCost).toFixed(2)} · Price{" "}
                  {Number(v.sellingPrice).toFixed(2)} · Profit{" "}
                  {Number(v.recipe.profit).toFixed(2)} · Margin{" "}
                  {Number(v.recipe.profitMargin).toFixed(2)}%
                </p>
                {hasPermission("inventory.variant.edit") && (
                  <InlinePricing variant={v} onSaved={load} />
                )}
              </>
            )}
          </section>
        ))}
      {tab === "Produce / Manufacture" && (
        <form onSubmit={produce} className={box}>
          <h2 className="font-bold">Produce Finished Bottles</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Product Variant"
              value={production.variantId}
              items={data.variants.filter((v) => v.status === "active")}
              onChange={(v) => {change("variantId",v);change("quantity",String(data.variants.find(x=>x.id===v)?.plannedQuantity || 1))}}
            />
            <Select
              label="Branch"
              value={production.branchId}
              items={locations.branches}
              onChange={(v) => change("branchId", v)}
            />
            <Select
              label="Source Raw Material Warehouse"
              value={production.sourceWarehouseId}
              items={locations.warehouses}
              onChange={(v) => change("sourceWarehouseId", v)}
            />
            <Select
              label="Finished Goods Warehouse"
              value={production.finishedWarehouseId}
              items={locations.warehouses}
              onChange={(v) => change("finishedWarehouseId", v)}
            />
            <Text
              label="Number of Bottles"
              type="number"
              min="1"
              step="1"
              required
              value={production.quantity}
              onChange={(v) => change("quantity", v)}
            />
          </div>
          <RecipeTable
            rows={variant?.recipe.rows || []}
            multiplier={Number(production.quantity) || 0}
            availability={availability}
          />
          {production.sourceWarehouseId&&!availability&&!availabilityError&&<p role="status" className="text-xs text-gray-500">Checking source stock…</p>}
          {availabilityError&&<p role="alert" className="text-sm text-rose-700">Source stock could not be loaded. Select the warehouse again or refresh this page.</p>}
          {insufficient&&<p role="alert" className="text-sm text-rose-700">Insufficient raw materials for this quantity. Reduce the quantity or restock the source warehouse.</p>}
          <p className="text-sm">
            Confirming production verifies availability, consumes raw materials
            and packaging, and posts finished stock in one transaction.
          </p>
          {(hasPermission("inventory.product.manufacture")||(hasPermission("production.add_batch") && hasPermission("production.complete"))) && (
              <button
                className={button}
                disabled={
                  busy || !availability || availabilityError || insufficient ||
                  !production.variantId ||
                  !production.branchId ||
                  !production.sourceWarehouseId ||
                  !production.finishedWarehouseId
                }
              >
                Confirm Production
              </button>
            )}
        </form>
      )}
      {tab === "Stock" && (
        <section className={box}>
          <p className="text-sm">
            Balances come from the central stock ledger. Reservations are not
            supported. Branch identifies production responsibility; finished
            stock belongs to the selected warehouse until transferred.
          </p>
          <div className="overflow-x-auto">
            <table className="erp-table w-full text-sm">
              <thead>
                <tr>
                  {[
                    "Variant / SKU",
                    "Location type",
                    "Branch / Warehouse",
                    "Available",
                    "Low stock",
                  ].map((x) => (
                    <th className="text-left p-2" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.stock.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">
                      {r.variant} / {r.sku}
                    </td>
                    <td>{r.locationType}</td>
                    <td>{r.location}</td>
                    <td>{Number(r.quantity)}</td>
                    <td>{r.lowStock ? "Low" : "Available"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link className={button} to="/transfers/create">
            Transfer Stock
          </Link>
        </section>
      )}
      {tab === "History" && (
        <section className={box}>
          <h2 className="font-bold">Production History</h2>
          {data.production.map((b) => (
            <div key={b.id} className="border-b py-3">
              <p>
                {b.batchNo} · {b.date} · {b.productSku} · {b.status} ·{" "}
                {b.producedQty} bottles
              </p>
              <details>
                <summary>Consumption snapshot</summary>
                {b.standardConsumption.map((r) => (
                  <p key={r.materialId}>
                    {r.name}: {r.actual} {r.unit} @ {r.rate}
                  </p>
                ))}
              </details>
            </div>
          ))}
          <h2 className="font-bold">
            Stock Movements, Adjustments, Sales &amp; Returns
          </h2>
          {data.movements.map((r) => (
            <p key={r.id} className="text-sm border-b py-2">
              {String(r.date)} · {r.transaction} · {r.reference} · {r.delta} ·
              Balance {r.newStock} · {r.reason}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
