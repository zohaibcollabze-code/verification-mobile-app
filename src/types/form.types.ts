/**
 * MPVP — Form Type Definitions
 * Props and types used by form components.
 */
import type { FindingsFieldSchema } from './schema.types';
import type { PhotoItem } from './store.types';

/** Props for the DynamicField component */
export interface DynamicFieldProps {
  field: FindingsFieldSchema;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

/** Props for the DynamicFindingsForm component */
export interface DynamicFindingsFormProps {
  schema: FindingsFieldSchema[];
  findingData: Record<string, any>;
  onFieldChange: (key: string, value: any) => void;
  errors: Record<string, string>;
  photos: PhotoItem[];
  onAddPhoto: (fieldKey: string) => void;
  onRemovePhoto: (photoId: string) => void;
}

/** Navigation param types for form screens */
export type InspectionFormParams = {
  requestId: string;
  editMode?: boolean;
};
