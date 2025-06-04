/**
 * Utility functions for handling Vietnamese names
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
 * Get initials from Vietnamese name
 * @param firstName - First name (Tên)
 * @param lastName - Last name (Họ)
 * @returns Initials (e.g., "NVĐ" for "Nguyễn Văn Đạt")
 */
export function getVietnameseInitials(firstName: string, lastName: string): string {
  const fullName = formatVietnameseName(firstName, lastName);
  if (!fullName) return '??';
  
  return fullName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3); // Limit to 3 characters for display
}

/**
 * Format employee name for display
 * @param employee - Employee object with firstName and lastName
 * @returns Formatted full name
 */
export function formatEmployeeName(employee: { firstName: string; lastName: string }): string {
  return formatVietnameseName(employee.firstName, employee.lastName);
}

/**
 * Get employee initials for avatar
 * @param employee - Employee object with firstName and lastName
 * @returns Initials
 */
export function getEmployeeInitials(employee: { firstName: string; lastName: string }): string {
  return getVietnameseInitials(employee.firstName, employee.lastName);
}
