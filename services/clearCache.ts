import { LOGIN_SOURCE_KEY } from "./api";

/**
 * Clear user-related cache data
 * Call this on login to ensure fresh permissions are loaded
 */
export const clearUserCache = () => {
  // Clear localStorage items
  localStorage.removeItem("user_data");
  localStorage.removeItem("auth_token");
  localStorage.removeItem(LOGIN_SOURCE_KEY);
  localStorage.removeItem("permissions_cache");
  localStorage.removeItem("role_cache");

  // Clear sessionStorage
  sessionStorage.clear();

  console.log("User cache cleared");
};

/**
 * Clear all application cache
 * Use sparingly - only when major changes occur
 */
export const clearAllCache = () => {
  localStorage.clear();
  sessionStorage.clear();

  console.log("All cache cleared");
};
