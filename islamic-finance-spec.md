# Islamic Finance Contract Modules — System Implementation Specification (v3.0)

## 1. System Architecture & Technical Guidelines

To ensure enterprise-grade reliability, compliance, and dynamic scalability, the system implements the following foundational technical frameworks.

### 1.1 Dynamic API-Driven Schema Architecture
All forms must be rendered dynamically on the frontend via standard REST endpoints (REST is the designated primary API standard; GraphQL may only be utilized as a secondary read-only layer). The backend will serve a structured JSON schema for every field, defining its type, validation, dependencies, sub-fields, and permissions.

**Example Dynamic Field Schema with Sub-fields for `inspection_evidence`:**
```json
{
  "fieldId": "inspection_evidence",
  "type": "textarea",
  "label": "Evidence to establish fresh goods received",
  "validation": {
    "required": true,
    "minLength": 50,
    "customErrorMessage": "Comprehensive evidence description is required."
  },
  "subFields": [
    {
      "fieldId": "evidence_attachment",
      "type": "fileUpload",
      "label": "Supporting Photographic Evidence (Sub-field a)",
      "validation": {
        "required": true,
        "maxSizeMB": 10,
        "allowedTypes": ["PNG", "JPG"]
      }
    }
  ],
  "permission": ["Field_Officer", "Branch_Manager"]
}
```

### 1.2 Core Database Schema & Entity Relationships

The relational data model enforces data integrity and lifecycle management.

- **`contracts`**: `id` (PK, UUID), `type` (ENUM), `client_id` (FK), `base_currency` (ISO 4217, 3-char), `status` (ENUM), `created_at` (TIMESTAMP), `created_by` (FK), `payload` (JSONB - dynamic field data).
- **`sub_documents`**: `id` (PK), `contract_id` (FK -> `contracts.id` ON DELETE RESTRICT), `document_type` (ENUM: GRN, INSPECTION), `data` (JSONB).
  > **Note**: A contract cannot be deleted if a related sub-document exists (RESTRICT).
- **`inspections`**: `id` (PK), `contract_id` (FK -> `contracts.id` ON DELETE CASCADE), `inspector_id` (FK), `date` (DATE), `status` (ENUM), `findings` (JSONB).
- **`partners`**: `id` (PK), `contract_id` (FK -> `contracts.id` ON DELETE CASCADE), `name` (VARCHAR), `capital_contribution` (DECIMAL 19,4), `profit_ratio` (DECIMAL 5,2).

### 1.3 Contract State Machine
Contracts adhere to a strict finite state machine, governing lifecycle and permitted actions:

1. **DRAFT**: Initial creation. All fields editable. Transitions to `PENDING_APPROVAL`.
2. **PENDING_APPROVAL**: Awaiting Branch Manager review. Transitions to `ACTIVE` (Approved) or `RETURNED_FOR_EDIT` (Rejected).
3. **RETURNED_FOR_EDIT**: Rejected with remarks. Editable by creator. Transitions to `PENDING_APPROVAL`.
4. **ACTIVE**: Contract is legally enforceable. Operations (Inspections, Payments) allowed. Transitions to `COMPLETED` or `DEFAULTED`.
5. **COMPLETED**: Contract fulfilled completely. Read-only.
6. **CANCELLED**: Terminated before activation. Read-only.
7. **DEFAULTED**: Breach of terms. Recovery actions initiated. Read-only (except for remediation).

### 1.4 Role-Based Access Control (RBAC) Matrix

| Role | Contract Scope | Permitted Actions |
|---|---|---|
| **Field Officer** | Own | Create (DRAFT), Edit (DRAFT, RETURNED), Submit Inspections |
| **Branch Manager** | Branch | View (All), Approve/Reject (PENDING_APPROVAL), Flag (ACTIVE) |
| **Shariah Officer** | Global | View (All), Certify Compliance (Sukuk, Istisna) — **Workflow:** Certify → Triggers cryptographic status lock on asset definition → Appends "Shariah Certified" badge on the contract header. |
| **Admin** | Global | System Configuration, User Management (No Contract Editing) |

### 1.5 Audit, Security, and Compliance

- **Immutable Audit Trails**: Every state transition and field update is logged in an append-only `audit_logs` table (`event_id`, `actor_id`, `action`, `previous_state`, `new_state`, `timestamp`, `ip_address`, `digital_signature`). Minimum retention policy: **7 Years**.
- **Digital Signatures**: "Signature Fields" employ **Advanced Electronic Signatures (AES)** cryptographic standards, capturing a secure hash of the document's payload at the moment of signing.
- **File Storage Infrastructure**: Uploads are restricted to 10MB maximum size. Permitted MIME types: PDF, JPG, PNG. **Mandatory** synchronous virus scanning via an integration like ClamAV before writing to secure blob storage.
- **Currency Handling**: Multi-currency capabilities are native. The system records all monetary amounts with their corresponding ISO 4217 Currency Code and captures the prevailing exchange rate for cross-currency accounting alignment.
- **Error Response Taxonomy**: API must return structured errors based on predefined codes:
  - `400 VALIDATION_ERROR`: Incorrect field data structure.
  - `403 FORBIDDEN_STATE_TRANSITION`: Role lacks permission for lifecycle action.
  - `409 BUSINESS_RULE_VIOLATION`: e.g., "Total profit ratio entries exceed 100%".

### 1.6 Performance SLAs, Disaster Recovery & Testing

- **Disaster Recovery Strategy**: Data persistence layers mandate Daily Snapshots, with a continuous 30-day point-in-time recovery window.
- **RPO and RTO Targets**: Recovery Point Objective (RPO) is set at a maximum of 1 hour. Recovery Time Objective (RTO) is 4 hours in the event of catastrophic failure.
- **Load Testing Standards**: The system must sustain a benchmark of 1000 concurrent users. API endpoint response times must remain at a p95 of < 200ms across all core functions under load.
- **Pagination Specifications**: Any scalable list response (e.g., Inspections, Partners) defaults to 20 items per page with a maximum request ceiling of 100 items. Cursor-based pagination must be implemented automatically whenever record sets exceed 10,000 entries.
- **Testing and Audits**: Mandatory automated integration tests must assert valid state transitions (Draft → Active → Completed/Defaulted) spanning the full end-to-end lifecycle. Bi-annual third-party penetration testing is mandated, alongside automated SAST/DAST integrations in the CI/CD pipeline.

---

## 2. Contract Module Specifications

### Contract 1 — Istisna (Manufacturing / Construction)

**Definition:** A contract to manufacture or construct an asset according to agreed specifications, with deferred delivery.
**Use Cases:** Construction projects, customized equipment, infrastructure.

#### Required Fields

| Field | Type | Notes |
|---|---|---|
| Asset Specifications | Textarea | Technical description, quantity, quality standards |
| Total Contract Price | Number | Currency formatted (Multi-currency supported) |
| Payment Schedule | Select | Options: Advance / Milestone / Deferred |
| Delivery Date | Date | |
| Delivery Location | Text | |
| Penalty Clauses | Textarea | Optional — delay penalties |
| Manufacturing Timeline | Date Range | Start and end dates |
| Ownership Transfer Terms | Textarea | |
| Warranty / Defect Liability Terms | Textarea | |

#### Istisna Sub-Document 1 — Goods Receiving Note (Schedule 3)

| Field | Type | Notes |
|---|---|---|
| Date | Date | Date of the receiving note |
| Manufacturer Name | Text | Name of the manufacturer |
| Manufacturer Address | Textarea | Full address |
| Notice of Delivery Date | Date | |
| Date of Receipt | Date | Actual date goods were received |
| Time of Receipt | Time | Exact time goods were received |
| Receipt Address | Text | Location where goods were received |
| Description of Goods Received | Textarea | Full description of goods as delivered |
| Additional Remarks | Textarea | Pre-filled with standard Al Baraka Bank legal disclaimer — editable |
| Authorised Signatory Name | Text | Signing on behalf of the bank |
| Signatory Designation | Text | |
| Signature | AES Signature | Cryptographic AES signature capture |

> **System Rule:** This document is linked to its parent Istisna contract via a RESTRICT foreign key. It must be stored, timestamped, and retrievable from within the contract record. The bank's rights reservation clause must appear in the Additional Remarks field by default.

#### Istisna Sub-Document 2 — Inspection Report

**Section A — Client Details**
1. Name of Client (Text)
2. Name of Contact Person at client premises where underlying asset is kept (Text)
3. Complete Address of Site Location (Textarea)
4. Contact Number of Inspection Site (Text)
5. Name of Related Branch Manager (BM) (Text)
6. Consumption Cycle / Inventory Holding Period of underlying asset (Number of Days)

**Section B — Transaction Details**
1. Size of this Istisna Transaction (Number - Base Currency)
2. Total Istisna Transactions executed to date (Number)
3. Date of subject Written Offer (Date)
4. Description of Goods as mentioned in subject Written Offer (Textarea)
5. Date of Declaration (Date)

**Section C — Inspection Details**
1. Total number of inspections carried till to date (Number)
2. This inspection number (Number)
3. This inspection date (Date)
4. Previous inspection status (Text)
5. Scope of Inspection (Textarea)
6. Type of Inspection (Select / Text)
7. Inspector Detail (Text)

**Section D — Inspection Findings / Observations**
1. Name / description of goods procured for Istisna — confirm if in line with LPO (Textarea)
2. Evidence to establish that fresh goods are received at client premises (Textarea with sub-field a)
3. How segregation is done (Textarea)
4. Consumption status of Istisna goods before Offer / Acceptance (Textarea with sub-field a)
5. Detail of deviation(s) from approved process flow (Textarea)
6. Overall Inspection Status (Select: Satisfactory/Unsatisfactory/Conditional + Textarea remarks)
7. Remarks (Textarea)

**Section E — Sign-Off**
Prepared & Reviewed by Name, Designation, Date, and AES Signature.

#### Istisna — Inspection Workflow Integrity
- Pre-Submission Checks: All sections are mandatory. Form conditionally requires sub-field inputs when specific options in Section D are fulfilled.
- On Submit: Timestamp and AES signature bound. Inspection count auto-increments. State logged.
- Post-Submission: Document is read-only.
- **Notification Engine**: If Status is Unsatisfactory/Conditional, trigger **primary In-App Notification**, secondary **Email escalation** as backup, and **SMS escalation** to the assigned Branch Manager if the notification remains unread for 15 minutes.

---

### Contract 2 — Salam (Forward Sale)

**Definition:** Buyer pays full price in advance for goods delivered at a future date.

> **System Rule:** Enforce block transaction submit if `payment_confirmation` toggle is strictly unverified.

| Field | Type | Notes |
|---|---|---|
| Commodity Type | Text | Fungible goods only — validate accordingly |
| Exact Quantity | Number | Include unit selector (kg / ton / litre / piece) |
| Quality Grade | Select | Options: Grade A / Grade B / Grade C / Custom |
| Full Contract Price | Number | Must equal total payment (currency aware) |
| Payment Confirmation | Boolean | Checkbox — must be true to submit |
| Delivery Date | Date | |
| Delivery Location | Text | |
| Storage / Transport Responsibility | Select | Options: Buyer / Seller / Third Party |

---

### Contract 3 — Murabaha (Cost-Plus Sale)

**Definition:** Seller discloses cost price and sells at an agreed profit margin.

| Field | Type | Notes |
|---|---|---|
| Asset Details | Textarea | Description, model, serial number if applicable |
| Original Purchase Cost | Number | |
| Agreed Profit Margin | Number | Percentage (%) |
| Final Sale Price | Number | Auto-calculated (UI & Backend Validation): `cost + (cost * margin / 100)` |
| Payment Mode | Select | Options: Lump Sum / Installments |
| Payment Schedule | Dynamic | Show installment table if Installments selected |
| Late Payment Terms | Textarea | Include charity clause |
| Asset Ownership Proof | File Upload | Max 10MB, PDF/JPG/PNG, Scan mandatory |

---

### Contract 4 — Ijarah (Leasing)

**Definition:** Leasing an asset for an agreed rental amount over a defined period.

| Field | Type | Notes |
|---|---|---|
| Asset Details | Textarea | Description, condition, location |
| Lease Duration | Number | Duration + unit selector (months / years) |
| Rental Amount | Number | |
| Payment Frequency | Select | Options: Monthly / Quarterly / Annually |
| Maintenance Responsibility | Select | Options: Lessor / Lessee |
| Takaful (Insurance) Responsibility | Select | Options: Lessor / Lessee |
| Ownership Transfer Clause | Boolean | Activates Ijarah Muntahia Bittamleek mode |
| Transfer Terms | Textarea | Conditional: show if ownership transfer enabled |
| Security Deposit | Number | Optional |

---

### Contract 5 — Musharakah (Joint Venture)

**Definition:** All partners contribute capital and share profit and loss proportionally.

| Field | Type | Notes |
|---|---|---|
| Business Purpose | Textarea | |
| Tenure | Date Range | Optional |
| Partners | Dynamic List | Supported actions: Add / Remove partners |
| — Partner Name | Text | |
| — Partner ID / Entity Number | Text | |
| — Capital Contribution | Number | |
| — Profit-Sharing Ratio | Number | Percentage (%) — backend rule: Sum exactly 100% |
| — Loss-Sharing Ratio | Number | Proportional to capital contribution |
| — Management Responsibilities | Textarea | |
| Exit Terms | Textarea | |

---

### Contract 6 — Mudarabah (Profit-Sharing Partnership)

**Definition:** One party provides capital (Rab-ul-Maal), the other provides expertise (Mudarib).

| Field | Type | Notes |
|---|---|---|
| Capital Amount | Number | |
| Capital Provider Name | Text | |
| Capital Provider ID | Text | |
| Manager Name | Text | |
| Manager ID | Text | |
| Profit-Sharing Ratio | Number | Percentage split (Must equal 100%) |
| Investment Scope | Textarea | Permitted and restricted activities |
| Loss Treatment | Textarea | Default: borne by capital provider |
| Reporting Frequency | Select | Options: Monthly / Quarterly / Bi-Annually / Annually |
| Tenure | Date Range | |
| Termination Conditions | Textarea | |

---

### Contract 7 — Sukuk (Islamic Bonds)

**Definition:** Asset-backed certificates representing proportional ownership.

| Field | Type | Notes |
|---|---|---|
| Underlying Asset Details | Textarea | |
| SPV Structure | Textarea | Special Purpose Vehicle details |
| Issue Size | Number | |
| Profit Rate | Number | Percentage (%) per annum |
| Tenure | Date Range | Start and maturity date |
| Payment Frequency | Select | Options: Monthly / Quarterly / Semi-Annually / Annually |
| Shariah Compliance Certification | File Upload | 10MB max, virus scan required, blocks issuance if missing |
| Redemption Mechanism | Textarea | |

---

### Contract 8 — Bai Muajjal (Deferred Payment Sale)

**Definition:** Sale of goods where the price is fixed upfront but payment is deferred.

| Field | Type | Notes |
|---|---|---|
| Asset Details | Textarea | |
| Sale Price | Number | Fixed at signing |
| Payment Schedule | Dynamic | Add multiple due dates with amounts |
| Due Date(s) | Date | Repeatable |
| Ownership Transfer Terms | Textarea | |
| Default Handling Terms | Textarea | |

---

## 3. Global Engineering Standards

- **Resilience and Validation**: Every validation rule must exist independently on the backend and frontend.
- **Dynamic Calculation Verification**: Auto-calculated fields must be validated by the engine upon submission to prevent frontend spoofing.
- **Responsive Experience**: Render engine explicitly supports Web Desktop, Tablet, and Mobile viewport standards natively without specialized forms.
- **Zero Hardcoding**: All options, taxonomies, and schema objects are requested via standard REST retrieval to allow localized system parameterization.
