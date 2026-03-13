import apiClient from '../api/apiClient';
import {
  Inspector,
  ApiResponse,
  InspectorProfile,
  InspectorProfilePatchPayload,
} from '../../types/api.types';
import { InspectorPermissions } from '../../utils/permissions';

type ProfileResponse = InspectorProfile | Inspector;

const ensureArray = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.split(',').map((city) => city.trim()).filter(Boolean);
  }
  return [];
};

const buildInitials = (name: string, fallback: string): string => {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }
    if (parts[0]) {
      return parts[0].slice(0, 2).toUpperCase();
    }
  }
  return fallback?.slice(0, 2).toUpperCase() || 'AG';
};

const normalizeProfileResponse = (payload: ProfileResponse): Inspector => {
  const raw: any = payload ?? {};
  const resolvedName: string = raw.full_name ?? raw.fullName ?? '';
  const resolvedPhone: string = raw.phone_number ?? raw.phone ?? '';
  const resolvedCnic: string = raw.cnic_number ?? raw.cnicNumber ?? '';
  const resolvedDesignation: string = raw.designation ?? raw.seniorityLevel ?? raw.seniority_level ?? 'Inspector';
  const resolvedEmployment: string = raw.employment_type ?? raw.employmentType ?? 'contract';
  const resolvedCities: string[] = ensureArray(raw.cities_covered ?? raw.citiesCovered);
  const resolvedBankScope: string = raw.bank_scope ?? raw.bankScope ?? 'single_bank';
  const resolvedAssignedBank = raw.assigned_bank_id ?? raw.assignedBankId ?? null;
  const resolvedProfileImage: string | null = raw.profile_image ?? raw.profilePictureUrl ?? null;
  const resolvedInitials: string = raw.profile_initials ?? buildInitials(resolvedName, raw.email ?? '');

  return {
    id: String(raw.userId ?? raw.id ?? ''),
    email: raw.email ?? '',
    full_name: resolvedName,
    cnic_number: resolvedCnic,
    designation: resolvedDesignation,
    employment_type: resolvedEmployment,
    cities_covered: resolvedCities,
    bank_scope: resolvedBankScope,
    assigned_bank_id: resolvedAssignedBank ? String(resolvedAssignedBank) : null,
    is_first_login: Boolean(raw.is_first_login ?? raw.isFirstLogin ?? false),
    phone_number: resolvedPhone,
    profile_initials: resolvedInitials,
    profile_image: resolvedProfileImage,
    fullName: resolvedName,
    phone: resolvedPhone,
    cnicNumber: resolvedCnic,
    seniority_level: raw.seniority_level ?? raw.seniorityLevel,
    seniorityLevel: raw.seniorityLevel ?? raw.seniority_level,
    employmentType: resolvedEmployment,
    citiesCovered: resolvedCities,
    bankScope: resolvedBankScope,
    assignedBankId: raw.assignedBankId ?? (resolvedAssignedBank ?? null),
    profilePictureUrl: resolvedProfileImage,
  };
};

export const profileService = {
  /**
   * Fetches the current inspector's profile.
   * Endpoint: GET /inspectors/me/profile
   */
  getProfile: async (): Promise<Inspector> => {
    const response = await apiClient.get<ApiResponse<ProfileResponse>>('/inspectors/me/profile');
    return normalizeProfileResponse(response.data.data!);
  },

  /**
   * Updates specific fields of the inspector's profile.
   * Sanitizes input to only allow patchable fields (§3.2).
   * Endpoint: PATCH /inspectors/me/profile
   */
  updateProfile: async (data: InspectorProfilePatchPayload): Promise<Inspector> => {
    const sanitizedData = InspectorPermissions.sanitizeProfilePatch(data);
    if (!Object.keys(sanitizedData).length) {
      throw new Error('No patchable fields provided for profile update');
    }
    const response = await apiClient.patch<ApiResponse<ProfileResponse>>('/inspectors/me/profile', sanitizedData);
    return normalizeProfileResponse(response.data.data!);
  },
};
