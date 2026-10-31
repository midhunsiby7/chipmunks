import { apiClient } from './apiClient';

/**
 * User Profile & Staff Management Service
 * Direct client integration for Brightloop user and identity APIs.
 */
export const userService = {
  /**
   * Initializes or claims a customer profile linked to the verified Firebase identity.
   * Invoked immediately after Firebase registration.
   *
   * @param {{ fullName: string, phoneNumber?: string, companyName?: string }} payload
   * @returns {Promise<any>} Created UserResponse
   */
  async initializeCustomerProfile({ fullName, phoneNumber, companyName }) {
    const response = await apiClient.post('/users/profile', {
      full_name: fullName.trim(),
      phone_number: phoneNumber ? phoneNumber.trim() : null,
      company_name: companyName ? companyName.trim() : null,
    });
    return response.data;
  },

  /**
   * Retrieves the authoritative profile of the currently authenticated user from FastAPI.
   * Includes authoritative role ('admin' | 'staff' | 'customer') and active status.
   *
   * @returns {Promise<any>} UserResponse
   */
  async getCurrentUserProfile() {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  /**
   * Lists application users with role filtering (Admin and Staff only).
   * Note: FastAPI backend automatically enforces role visibility:
   * - Admin can view all roles.
   * - Staff can view only customer profiles.
   *
   * @param {{ page?: number, pageSize?: number, role?: string, search?: string }} [params]
   * @returns {Promise<any>} PaginatedResponse<UserResponse>
   */
  async listUsers({ page = 1, pageSize = 20, role, search } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('page_size', String(pageSize));
    if (role && role !== 'all') query.set('role', role);
    if (search && search.trim()) query.set('search', search.trim());

    const response = await apiClient.get(`/users?${query.toString()}`);
    return response.data;
  },

  /**
   * Creates a new staff member account in Firebase & PostgreSQL (Admin only).
   *
   * @param {{ email: string, fullName: string, phoneNumber?: string, companyName?: string }} payload
   * @returns {Promise<any>} StaffCreateResponse
   */
  async createStaff({ email, fullName, phoneNumber, companyName }) {
    const response = await apiClient.post('/users/staff', {
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      phone_number: phoneNumber ? phoneNumber.trim() : null,
      company_name: companyName ? companyName.trim() : null,
    });
    return response.data;
  },

  /**
   * Re-dispatches or generates setup links for a staff member (Admin only).
   *
   * @param {string} staffId
   * @returns {Promise<any>} ResendLinksResponse
   */
  async resendStaffLinks(staffId) {
    const response = await apiClient.post(`/users/staff/${staffId}/resend-setup-link`);
    return response.data;
  },
};

export default userService;
