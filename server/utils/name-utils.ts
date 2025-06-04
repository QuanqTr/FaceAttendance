/**
 * Utility functions for handling Vietnamese names on the server side
 * Vietnamese name format: lastName firstName (Họ Tên)
 * Example: Nguyễn Văn Đạt (not Đạt Nguyễn Văn)
 */

/**
 * Format full name in Vietnamese style: lastName firstName
 * @param firstName - First name (Tên)
 * @param lastName - Last name (Họ)
 * @returns Formatted full name in Vietnamese style
 */
export function formatVietnameseName(firstName: string, lastName: string): string {
  if (!firstName && !lastName) return '';
  if (!firstName) return lastName;
  if (!lastName) return firstName;
  
  // Vietnamese format: lastName firstName (Họ Tên)
  return `${lastName} ${firstName}`.trim();
}

/**
 * Format employee name for API responses
 * @param employee - Employee object with firstName and lastName
 * @returns Formatted full name
 */
export function formatEmployeeName(employee: { firstName: string; lastName: string }): string {
  return formatVietnameseName(employee.firstName, employee.lastName);
}
