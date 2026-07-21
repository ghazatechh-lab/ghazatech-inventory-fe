import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import api, { unwrap } from "@/lib/api";
import { DataTable } from "@/components/common/DataTable";
import { SearchInput } from "@/components/common/SearchInput";
import { useDebouncedValue } from "@/hooks/useDebounce";

export const LIST_PAGE_SIZE = 12;

export function useListQuery(key, endpoint, extraParams = {}) {
  const [params, setParams] = useSearchParams();

  const page = Math.max(1, Number(params.get("page") || 1));

  const q = params.get("q") || "";
  const ordering = params.get("ordering") || "";

  const debouncedQ = useDebouncedValue(q, 300);

  const updateParams = React.useCallback(
    (updates) => {
      const next = new URLSearchParams(params);

      Object.entries(updates).forEach(([name, value]) => {
        if (value === undefined || value === null || value === "") {
          next.delete(name);
        } else {
          next.set(name, String(value));
        }
      });

      setParams(next);
    },
    [params, setParams],
  );

  const setPage = React.useCallback(
    (nextPage) => {
      updateParams({
        page: Math.max(1, Number(nextPage) || 1),
      });
    },
    [updateParams],
  );

  const setQ = React.useCallback(
    (value) => {
      updateParams({
        q: value,
        page: 1,
      });
    },
    [updateParams],
  );

  const setOrdering = React.useCallback(
    (value) => {
      updateParams({
        ordering: value,
        page: 1,
      });
    },
    [updateParams],
  );

  const setFilter = React.useCallback(
    (name, value) => {
      updateParams({
        [name]: value,
        page: 1,
      });
    },
    [updateParams],
  );

  const getFilter = React.useCallback(
    (name) => params.get(name) || "",
    [params],
  );

  const requestParams = React.useMemo(() => {
    const urlParams = Object.fromEntries(params.entries());

    delete urlParams.q;

    return {
      ...urlParams,

      search: debouncedQ || undefined,

      q: debouncedQ || undefined,

      page,

      page_size: LIST_PAGE_SIZE,

      ordering: ordering || undefined,

      ...extraParams,
    };
  }, [params, debouncedQ, page, ordering, extraParams]);

  const query = useQuery({
    queryKey: [key, endpoint, requestParams],

    queryFn: async () => {
      const response = await api.get(endpoint, {
        params: requestParams,
      });

      return unwrap(response);
    },

    placeholderData: (previousData) => previousData,
  });

  return {
    query,

    page,

    pageSize: LIST_PAGE_SIZE,

    q,

    ordering,

    setPage,

    setQ,

    setOrdering,

    setFilter,

    getFilter,
  };
}

export { DataTable, SearchInput };
