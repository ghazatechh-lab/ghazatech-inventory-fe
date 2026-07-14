import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api, { unwrap } from "@/lib/api";
import { DataTable } from "@/components/common/DataTable";
import { SearchInput } from "@/components/common/SearchInput";
import { useDebouncedValue } from "@/hooks/useDebounce";

export function useListQuery(key, endpoint, extraParams = {}) {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") || 1);
  const q = params.get("q") || "";
  const debouncedQ = useDebouncedValue(q, 300);

  const setPage = (p) => {
    const next = new URLSearchParams(params);
    next.set("page", p);
    setParams(next);
  };
  const setQ = (v) => {
    const next = new URLSearchParams(params);
    if (v) next.set("q", v); else next.delete("q");
    next.set("page", "1");
    setParams(next);
  };
  const setFilter = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    next.set("page", "1");
    setParams(next);
  };
  const getFilter = (k) => params.get(k) || "";

  const query = useQuery({
    queryKey: [key, debouncedQ, page, params.toString(), extraParams],
    queryFn: async () => unwrap(await api.get(endpoint, { params: { q: debouncedQ, page, page_size: 20, ...Object.fromEntries(params.entries()), ...extraParams } })),
  });
  return { query, page, q, setPage, setQ, setFilter, getFilter };
}

export { DataTable, SearchInput };
