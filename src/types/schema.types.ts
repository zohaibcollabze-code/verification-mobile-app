/**
 * MPVP — Schema Types for Dynamic Findings Form
 * These types drive the schema-driven inspection form (Step 3).
 * NEVER hardcode field labels or structure for any contract type.
 */

/** Supported field types for dynamic form rendering */
export type FindingsFieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'dropdown'
  | 'date_range'
  | 'boolean'
  | 'file_upload'
  | 'partner_list';

/** Single field definition within a findings schema */
export interface FindingsFieldSchema {
  /** Field identifier — used as key in finding_data submission payload */
  key: string;
  /** Display label for the field */
  label: string;
  /** Field type — determines which input component renders */
  type: FindingsFieldType;
  /** Whether the field is required for submission */
  required: boolean;
  /** Offline spec: render-only flag for media-capable findings */
  photo?: boolean;
  /** Options for dropdown type fields */
  options?: string[];
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional default value */
  default_value?: any;
  /** Maximum character length */
  max_length?: number;
  /** If true, show photo attachment UI below this field */
  requires_photo?: boolean;
  /** Pre-fill caption for attached photos */
  photo_caption_hint?: string;
  /** Minimum photos required for this field */
  min_photos?: number;
  /** If true, this field captures video evidence; false = image only */
  video?: boolean;
}

/** Complete findings schema — array of field definitions */
export type FindingsSchema = FindingsFieldSchema[];

/** Overall inspection result — fixed across all contract types (PAVMP §11.2) */
export type InspectionOverallStatus = 'satisfactory' | 'unsatisfactory' | 'conditional';
