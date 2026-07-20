import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api, {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearStoredAuth,
  getApiErrorMessage,
  unwrap,
} from "./api";

const AuthContext = createContext(null);

const USER_STORAGE_KEY = "user";
const BRANCH_OVERRIDE_KEY = "branch_override";

const readStoredUser = () => {
  try {
    const value = localStorage.getItem(USER_STORAGE_KEY);

    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const saveStoredUser = (user) => {
  if (!user) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

const readStoredBranchOverride = () => {
  try {
    const value = localStorage.getItem(BRANCH_OVERRIDE_KEY);

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value);

    if (parsed === null || parsed === undefined || parsed === "") {
      return null;
    }

    return parsed;
  } catch (error) {
    localStorage.removeItem(BRANCH_OVERRIDE_KEY);

    return null;
  }
};

const saveStoredBranchOverride = (branch) => {
  if (branch === null || branch === undefined || branch === "") {
    localStorage.removeItem(BRANCH_OVERRIDE_KEY);

    return;
  }

  localStorage.setItem(BRANCH_OVERRIDE_KEY, JSON.stringify(branch));
};

const extractAuthData = (response) => {
  const body = response?.data;

  return body?.data || body || {};
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());

  const [branchOverride, setBranchOverrideState] = useState(() =>
    readStoredBranchOverride(),
  );

  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem(REFRESH_TOKEN_KEY),
  );

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
    saveStoredUser(nextUser);
  }, []);

  const setBranchOverride = useCallback((branch) => {
    let normalizedBranch = branch;

    /*
     * Support selectors that pass a DOM event.
     */
    if (branch && typeof branch === "object" && branch.target) {
      normalizedBranch = branch.target.value;
    }

    /*
     * Support a branch object, branch ID,
     * numeric string, or null.
     */
    if (
      normalizedBranch === "" ||
      normalizedBranch === "all" ||
      normalizedBranch === "null" ||
      normalizedBranch === undefined
    ) {
      normalizedBranch = null;
    } else if (normalizedBranch && typeof normalizedBranch === "object") {
      normalizedBranch =
        normalizedBranch.id ??
        normalizedBranch.branch_id ??
        normalizedBranch.value ??
        null;
    }

    if (
      typeof normalizedBranch === "string" &&
      normalizedBranch.trim() !== ""
    ) {
      const numericValue = Number(normalizedBranch);

      normalizedBranch = Number.isNaN(numericValue)
        ? normalizedBranch
        : numericValue;
    }

    setBranchOverrideState(normalizedBranch);

    saveStoredBranchOverride(normalizedBranch);
  }, []);

  const clearAuth = useCallback(() => {
    clearStoredAuth();

    localStorage.removeItem(BRANCH_OVERRIDE_KEY);

    setUser(null);
    setBranchOverrideState(null);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    const currentAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!currentAccessToken && !currentRefreshToken) {
      setUser(null);
      return null;
    }

    try {
      const response = await api.get("/auth/profile/", {
        skipGlobalErrorToast: true,
      });

      const currentUser = unwrap(response);

      if (currentUser) {
        updateUser(currentUser);
      }

      return currentUser;
    } catch (error) {
      const status = error?.response?.status;

      const stillHasAccess = localStorage.getItem(ACCESS_TOKEN_KEY);

      const stillHasRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (status === 401 && !stillHasAccess && !stillHasRefresh) {
        clearAuth();
      }

      return null;
    }
  }, [clearAuth, updateUser]);

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (!storedAccessToken && !storedRefreshToken) {
          if (active) {
            setUser(null);
          }

          return;
        }

        await fetchCurrentUser();
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      active = false;
    };
  }, [fetchCurrentUser]);

  const login = useCallback(
    async (credentials) => {
      try {
        const response = await api.post("/auth/login/", credentials, {
          skipGlobalErrorToast: true,
        });

        const authData = extractAuthData(response);

        const newAccessToken = authData?.access;

        const newRefreshToken = authData?.refresh;

        const authenticatedUser =
          authData?.user || authData?.profile || authData?.account || null;

        if (!newAccessToken || !newRefreshToken) {
          throw new Error(
            "Login response did not contain authentication tokens.",
          );
        }

        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);

        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        if (authenticatedUser) {
          updateUser(authenticatedUser);

          const userBranchId =
            authenticatedUser?.branch?.id ??
            authenticatedUser?.branch_id ??
            null;

          /*
           * Select the user's own branch only
           * when no override is already saved.
           */
          if (userBranchId && readStoredBranchOverride() === null) {
            setBranchOverride(userBranchId);
          }
        } else {
          await fetchCurrentUser();
        }

        return {
          success: true,
          user: authenticatedUser || readStoredUser(),
        };
      } catch (error) {
        clearAuth();

        return {
          success: false,
          message: getApiErrorMessage(
            error,
            "Login failed. Please check your credentials.",
          ),
          error,
        };
      }
    },
    [clearAuth, fetchCurrentUser, setBranchOverride, updateUser],
  );

  const logout = useCallback(async () => {
    const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    try {
      if (currentRefreshToken) {
        await api.post(
          "/auth/logout/",
          {
            refresh: currentRefreshToken,
          },
          {
            skipGlobalErrorToast: true,
          },
        );
      }
    } catch (error) {
      console.warn("Server logout failed:", error);
    } finally {
      delete api.defaults.headers.common.Authorization;

      clearAuth();
    }
  }, [clearAuth]);

  const refreshUser = useCallback(async () => {
    return fetchCurrentUser();
  }, [fetchCurrentUser]);

  const hasRole = useCallback(
    (...allowedRoles) => {
      if (!user) {
        return false;
      }

      const normalizedRoles = allowedRoles
        .flat()
        .filter(Boolean)
        .map((role) => String(role).toUpperCase());

      const currentRole =
        user?.role_code ||
        user?.role?.code ||
        user?.role ||
        user?.user_role ||
        "";

      return normalizedRoles.includes(String(currentRole).toUpperCase());
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,

      login,
      logout,
      refreshUser,
      updateUser,
      hasRole,

      branchOverride,
      setBranchOverride,
    }),
    [
      user,
      isLoading,
      isAuthenticated,
      login,
      logout,
      refreshUser,
      updateUser,
      hasRole,
      branchOverride,
      setBranchOverride,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

export default AuthContext;
