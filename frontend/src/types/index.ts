export interface User {
  id: number;
  business_id: number;
  business_name?: string;
  business_slug?: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface BusinessSettings {
  id: number;
  business_id: number;
  currency: string;
  currency_symbol: string;
  default_tax_rate: number;
  tax_label: string;
  tax_note?: string;
  default_validity_days: number;
  default_payment_terms: string;
  default_delivery_terms: string;
  quotation_prefix: string;
  labour_cost_per_hour: number;
  default_manual_prep_time_minutes: number;
  min_margin_threshold_pct: number;
  max_discount_threshold_pct: number;
  updated_at?: string;
}

export interface Business {
  id: number;
  name: string;
  slug: string;
  tagline?: string;
  logo_url?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  pan?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  created_at: string;
  settings?: BusinessSettings;
}

export interface Product {
  id: number;
  business_id: number;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  hsn_code?: string;
  unit_selling_price: number;
  unit_cost: number;
  stock_quantity: number;
  reorder_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Customer {
  id: number;
  business_id: number;
  name: string;
  company_name: string;
  email?: string;
  phone: string;
  gstin?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  created_at: string;
}

export interface ExtractedItem {
  product_query: string;
  quantity: number;
  unit: string;
  specifications?: string;
  urgency_or_notes?: string;
}

export interface ExtractedEnquiryStructure {
  customer_name?: string;
  company_name?: string;
  contact_phone?: string;
  contact_email?: string;
  delivery_location?: string;
  requested_delivery_date?: string;
  requested_items: ExtractedItem[];
  special_requirements: string[];
  missing_information: string[];
  ambiguities: string[];
  ai_confidence_score: number;
  ai_model_name: string;
}

export interface ProductMatchCandidate {
  product_id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unit_selling_price: number;
  unit_cost: number;
  stock_quantity: number;
  match_score: number;
}

export interface MatchedEnquiryItem {
  original_item: ExtractedItem;
  match_type: 'VERIFIED_EXACT' | 'SUGGESTED_MATCH' | 'UNMATCHED';
  match_confidence: number;
  matched_product_id?: number;
  sku?: string;
  name?: string;
  description?: string;
  unit_selling_price: number;
  unit_cost: number;
  stock_available: number;
  quantity: number;
  unit: string;
  line_total: number;
  has_stock_warning: boolean;
  has_margin_warning: boolean;
  warning_details?: string;
  candidates: ProductMatchCandidate[];
}

export interface EnquiryMatchingResponse {
  enquiry_id: number;
  extracted_structure: ExtractedEnquiryStructure;
  matched_items: MatchedEnquiryItem[];
  total_estimated_subtotal: number;
  processing_time_seconds: number;
  ai_mode_used: string;
}

export interface Enquiry {
  id: number;
  business_id: number;
  customer_id?: number;
  customer_name_raw?: string;
  customer_contact_raw?: string;
  title: string;
  source: string;
  raw_text: string;
  ai_processed: boolean;
  ai_model_used?: string;
  extracted_data_json?: string;
  status: string;
  created_at: string;
}

export interface GuardrailWarning {
  code: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  item_index?: number;
  item_name?: string;
  message: string;
  data?: Record<string, any>;
}

export interface QuotationItem {
  id?: number;
  quotation_id?: number;
  product_id?: number;
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  unit_cost: number;
  discount_pct: number;
  line_total: number;
  verification_status: string;
  match_confidence: number;
  stock_available?: number;
  has_stock_warning?: boolean;
  has_margin_warning?: boolean;
  warning_details?: string;
}

export interface QuotationCalculationResponse {
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  taxable_amount: number;
  tax_rate: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  delivery_charge: number;
  grand_total: number;
  total_cost: number;
  estimated_gross_profit: number;
  estimated_gross_margin_pct: number;
  warnings: GuardrailWarning[];
}

export interface Quotation {
  id: number;
  business_id: number;
  customer_id: number;
  customer_name?: string;
  customer_company?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_gstin?: string;
  enquiry_id?: number;
  quotation_number: string;
  title?: string;
  status: 'DRAFT' | 'NEEDS_REVIEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'PENDING_RESPONSE' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  currency: string;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  tax_rate: number;
  tax_amount: number;
  tax_type: string;
  delivery_charge: number;
  grand_total: number;
  total_cost: number;
  estimated_gross_margin_pct: number;
  valid_until?: string;
  payment_terms?: string;
  delivery_terms?: string;
  notes?: string;
  rejection_reason?: string;
  approved_at?: string;
  approved_by_user_id?: number;
  has_guardrail_warnings: boolean;
  guardrail_warnings_json?: string;
  sent_at?: string;
  expires_at?: string;
  responded_at?: string;
  customer_response?: string;
  response_notes?: string;
  public_token?: string;
  seconds_remaining?: number;
  is_expired?: boolean;
  created_at: string;
  updated_at?: string;
  items: QuotationItem[];
}

export interface RetailerPortalData {
  id: number;
  quotation_number: string;
  title?: string;
  status: string;
  business_name?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  business_gstin?: string;
  customer_name?: string;
  customer_company?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_gstin?: string;
  currency: string;
  subtotal: number;
  discount_amount: number;
  discount_percentage?: number;
  tax_rate: number;
  tax_amount: number;
  tax_type?: string;
  delivery_charge: number;
  grand_total: number;
  notes?: string;
  payment_terms?: string;
  delivery_terms?: string;
  sent_at?: string;
  expires_at?: string;
  responded_at?: string;
  customer_response?: string;
  response_notes?: string;
  public_token?: string;
  seconds_remaining?: number;
  is_expired?: boolean;
  items: QuotationItem[];
}

export interface QuotationListResponse {
  items: Quotation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface QuotationStatusCounts {
  total: number;
  draft: number;
  needs_review: number;
  pending_approval: number;
  approved: number;
  pending_response: number;
  accepted: number;
  rejected: number;
  expired: number;
  cancelled: number;
}

export interface ApprovalEvent {
  id: number;
  quotation_id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  comments?: string;
  created_at: string;
}

export interface AuditEvent {
  id: number;
  business_id: number;
  quotation_id?: number;
  user_id?: number;
  user_email?: string;
  event_type: string;
  description: string;
  metadata_json?: string;
  created_at: string;
}

export interface AuditListResponse {
  items: AuditEvent[];
  total: number;
}

export interface ROITrendPoint {
  date: string;
  manual_time_mins: number;
  ai_assisted_time_mins: number;
  time_saved_mins: number;
  quotations_count: number;
  labour_value_saved: number;
}

export interface ROISummaryResponse {
  total_quotations_processed: number;
  measured_quotations_count: number;
  demo_quotations_count: number;
  baseline_estimate_count: number;
  avg_manual_prep_time_minutes: number;
  avg_ai_assisted_prep_time_minutes: number;
  avg_time_saved_per_quotation_minutes: number;
  total_time_saved_hours: number;
  avg_time_reduction_percentage: number;
  total_fields_corrected: number;
  field_correction_rate_pct: number;
  total_validation_errors_caught: number;
  configured_labour_cost_per_hour: number;
  currency_symbol: string;
  total_estimated_labour_value_saved: number;
  total_ai_operating_costs: number;
  net_productivity_benefit: number;
  sample_size_info: {
    total: number;
    measured: number;
    demo: number;
    baseline_estimates: number;
  };
  trend_data: ROITrendPoint[];
}
