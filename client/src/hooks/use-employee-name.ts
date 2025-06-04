import { formatEmployeeName, getEmployeeInitials } from "@/lib/name-utils";

/**
 * Hook to format employee names consistently across the application
 */
export function useEmployeeName() {
  return {
    formatName: formatEmployeeName,
    getInitials: getEmployeeInitials
  };
}
