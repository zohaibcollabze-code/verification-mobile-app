import { Assignment } from '../types/api.types';

export class InspectorPermissions {
  /**
   * Returns true only if this inspector can act on the given job detail.
   * Logic derived from Role-Based Permission Matrix in the integration guide.
   */
  static canAccept(job: any, userId: string): boolean {
    const status = job.status?.toUpperCase();
    const inspectorId = job.currentAssignment?.inspectorId || job.userId || job.current_assignment?.inspector_id;
    const isAccepted = job.currentAssignment?.acceptedAt || job.current_assignment?.accepted_at || false;
    const isRejected = job.currentAssignment?.rejectedAt || job.current_assignment?.rejected_at || false;

    return (
      (status === 'ASSIGNED' || status === 'NEW' || status === 'PENDING') &&
      inspectorId === userId &&
      !isAccepted &&
      !isRejected
    );
  }

  static canReject(job: any, userId: string): boolean {
    return this.canAccept(job, userId);
  }

  static canSubmitFindings(job: Assignment, userId: string): boolean {
    return (
      job.status === 'IN_PROGRESS' &&
      job.current_assignment?.inspector_id === userId
    );
  }

  static canResubmitFindings(job: Assignment, userId: string): boolean {
    return (
      job.status === 'RETURNED' &&
      job.current_assignment?.inspector_id === userId
    );
  }

  /**
   * Combined check for both submit and resubmit scenarios.
   * Use this when you need to allow submission for both IN_PROGRESS and RETURNED.
   */
  static canSubmitOrResubmit(job: Assignment, userId: string): boolean {
    return (
      (job.status === 'IN_PROGRESS' || job.status === 'RETURNED') &&
      job.current_assignment?.inspector_id === userId
    );
  }

  /**
   * Guards profile field mutations — only specific fields may be patched.
   */
  private static readonly PATCHABLE_PROFILE_FIELDS = new Set([
    'fullName',
    'phone',
    'designation',
    'profilePictureUrl',
    'cnicNumber',
    'seniorityLevel',
    'employmentType',
    'citiesCovered',
    'bankScope',
    'assignedBankId',
  ]);

  private static readonly PATCH_FIELD_ALIASES: Record<string, string> = {
    full_name: 'fullName',
    fullName: 'fullName',
    phone_number: 'phone',
    phone: 'phone',
    designation: 'designation',
    cnic_number: 'cnicNumber',
    cnicNumber: 'cnicNumber',
    seniority_level: 'seniorityLevel',
    seniorityLevel: 'seniorityLevel',
    employment_type: 'employmentType',
    employmentType: 'employmentType',
    cities_covered: 'citiesCovered',
    citiesCovered: 'citiesCovered',
    bank_scope: 'bankScope',
    bankScope: 'bankScope',
    assigned_bank_id: 'assignedBankId',
    assignedBankId: 'assignedBankId',
    profile_image: 'profilePictureUrl',
    profilePictureUrl: 'profilePictureUrl',
    profile_picture_url: 'profilePictureUrl',
  };

  static sanitizeProfilePatch(input: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const key in input) {
      const normalizedKey = this.PATCH_FIELD_ALIASES[key] ?? key;
      if (!this.PATCHABLE_PROFILE_FIELDS.has(normalizedKey)) {
        continue;
      }
      const value = input[key];
      if (value === undefined || value === null) {
        continue;
      }
      sanitized[normalizedKey] = typeof value === 'string' ? value.trim() : value;
    }
    return sanitized;
  }
}
