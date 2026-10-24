import os
import sys
import json
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.business import Business
from app.models.user import User
from app.models.settings import BusinessSettings
from app.models.product import Product
from app.models.customer import Customer
from app.models.enquiry import Enquiry
from app.models.quotation import Quotation, QuotationItem
from app.models.approval import ApprovalEvent
from app.models.audit import AuditEvent
from app.models.roi import ProductivityMeasurement

def seed_database():
    print("[*] Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if demo business already exists
        existing_biz = db.query(Business).filter(Business.slug == "apex-industrial-solutions").first()
        if existing_biz:
            print("[!] Demo business already exists. Re-seeding clean demo dataset...")
            # Delete existing records for clean demo
            db.delete(existing_biz)
            db.commit()

        print("[*] Creating Demo Business: Apex Industrial & Electro-Mech Solutions Pvt. Ltd.")
        business = Business(
            name="Apex Industrial & Electro-Mech Solutions Pvt. Ltd.",
            slug="apex-industrial-solutions",
            tagline="Precision Engineering, Electrical Motors & Industrial Pneumatics Wholesaler",
            logo_url="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80",
            email="sales@apexindustrial.in",
            phone="+91 20 2712 8844",
            address="Plot No. B-42, MIDC Industrial Area, Bhosari",
            city="Pune",
            state="Maharashtra",
            pincode="411026",
            gstin="27AABCA1234F1Z5",
            pan="AABCA1234F",
            bank_name="State Bank of India (Commercial Branch)",
            bank_account_no="39485720194",
            bank_ifsc="SBIN0004521"
        )
        db.add(business)
        db.flush()

        print("[*] Creating Business Settings & Guardrails...")
        settings = BusinessSettings(
            business_id=business.id,
            currency="INR",
            currency_symbol="₹",
            default_tax_rate=18.0,
            tax_label="GST (9% CGST + 9% SGST / 18% IGST)",
            tax_note="Standard GST applicable for industrial machinery and components. HSN listed per item.",
            default_validity_days=30,
            default_payment_terms="50% advance with Purchase Order, 50% against proforma invoice before dispatch. Delivery within 7 to 10 working days.",
            default_delivery_terms="Ex-works Bhosari Pune warehouse. Freight and transit insurance extra at actuals unless otherwise agreed in writing.",
            quotation_prefix="VP",
            labour_cost_per_hour=350.0,  # ₹350/hour typical MSME estimator wage
            default_manual_prep_time_minutes=35.0,  # 35 min manual baseline
            min_margin_threshold_pct=15.0,  # 15% minimum margin guardrail
            max_discount_threshold_pct=20.0  # 20% max discount guardrail
        )
        db.add(settings)

        print("[*] Creating Demo Users...")
        demo_user = User(
            business_id=business.id,
            email="demo@vyaparpilot.in",
            hashed_password=get_password_hash("demoPassword123!"),
            full_name="Vikramaditya Deshmukh",
            role="owner",
            is_active=True
        )
        sales_rep = User(
            business_id=business.id,
            email="sales@vyaparpilot.in",
            hashed_password=get_password_hash("salesPassword123!"),
            full_name="Pooja Kulkarni",
            role="sales_rep",
            is_active=True
        )
        db.add_all([demo_user, sales_rep])
        db.flush()

        print("[*] Creating Realistic Product Catalogue (18 Industrial Items)...")
        sample_products = [
            Product(
                business_id=business.id,
                sku="IND-MTR-001",
                name="Three-Phase Induction Motor 5HP 1440 RPM",
                description="TEFC Squirrel Cage 415V, 50Hz, Class F insulation, Foot Mounted (B3), High efficiency IE2",
                category="Motors & Pumps",
                unit="PCS",
                hsn_code="85015210",
                unit_selling_price=18500.0,
                unit_cost=14200.0,
                stock_quantity=18,
                reorder_threshold=5
            ),
            Product(
                business_id=business.id,
                sku="IND-MTR-002",
                name="Three-Phase Induction Motor 10HP 1440 RPM",
                description="Cast iron frame, 415V ±10%, IP55 protection, Flange mounted (B5), Premium IE3",
                category="Motors & Pumps",
                unit="PCS",
                hsn_code="85015210",
                unit_selling_price=32400.0,
                unit_cost=25800.0,
                stock_quantity=8,
                reorder_threshold=3
            ),
            Product(
                business_id=business.id,
                sku="IND-PMP-001",
                name="Centrifugal Monoblock Water Pump 2HP",
                description="Single phase 230V, 50Hz, 32x25mm delivery size, 25m head, high suction capacity",
                category="Motors & Pumps",
                unit="PCS",
                hsn_code="84137010",
                unit_selling_price=11200.0,
                unit_cost=8600.0,
                stock_quantity=22,
                reorder_threshold=6
            ),
            Product(
                business_id=business.id,
                sku="IND-PNE-001",
                name="Heavy Duty Pneumatic Cylinder 50mm Bore",
                description="Double acting pneumatic cylinder, 200mm stroke length, magnetic piston with adjustable cushioning",
                category="Pneumatics",
                unit="PCS",
                hsn_code="84123100",
                unit_selling_price=4850.0,
                unit_cost=3400.0,
                stock_quantity=35,
                reorder_threshold=10
            ),
            Product(
                business_id=business.id,
                sku="IND-PNE-002",
                name="5/2 Way Solenoid Valve 24V DC",
                description="G 1/4 inch port, single solenoid pilot operated, with LED plug connector and manual override",
                category="Pneumatics",
                unit="PCS",
                hsn_code="84812000",
                unit_selling_price=1750.0,
                unit_cost=1150.0,
                stock_quantity=50,
                reorder_threshold=15
            ),
            Product(
                business_id=business.id,
                sku="IND-PNE-003",
                name="FRL Air Filter Regulator Lubricator Unit 1/2 Inch",
                description="Modular combined unit with pressure gauge, auto drain filter, 40 micron element",
                category="Pneumatics",
                unit="SETS",
                hsn_code="84213920",
                unit_selling_price=3200.0,
                unit_cost=2250.0,
                stock_quantity=14,
                reorder_threshold=5
            ),
            Product(
                business_id=business.id,
                sku="IND-ELE-001",
                name="3-Pole Power Contactor 32A 230V Coil",
                description="AC-3 duty 15kW/20HP rating, 1NO + 1NC auxiliary contacts, DIN rail mountable",
                category="Electrical Switchgear",
                unit="PCS",
                hsn_code="85364900",
                unit_selling_price=1450.0,
                unit_cost=980.0,
                stock_quantity=60,
                reorder_threshold=20
            ),
            Product(
                business_id=business.id,
                sku="IND-ELE-002",
                name="Thermal Overload Relay 16A-24A",
                description="Direct mounting to contactor, differential phase failure sensitivity, manual/auto reset",
                category="Electrical Switchgear",
                unit="PCS",
                hsn_code="85364900",
                unit_selling_price=1100.0,
                unit_cost=750.0,
                stock_quantity=45,
                reorder_threshold=15
            ),
            Product(
                business_id=business.id,
                sku="IND-ELE-003",
                name="Variable Frequency Drive (VFD) 7.5kW 10HP",
                description="3-Phase 415V input/output, V/f and sensorless vector control, built-in Modbus RS485 communication",
                category="Electrical Switchgear",
                unit="PCS",
                hsn_code="85044090",
                unit_selling_price=28900.0,
                unit_cost=22400.0,
                stock_quantity=6,
                reorder_threshold=2
            ),
            Product(
                business_id=business.id,
                sku="IND-CAB-001",
                name="4-Core 4.0 sq.mm Copper Armoured Power Cable",
                description="1100V XLPE insulated, round aluminium wire armoured (AWA), PVC outer sheath, per meter",
                category="Cables & Wiring",
                unit="METERS",
                hsn_code="85444999",
                unit_selling_price=195.0,
                unit_cost=155.0,
                stock_quantity=650,
                reorder_threshold=150
            ),
            Product(
                business_id=business.id,
                sku="IND-CAB-002",
                name="Flexible Multi-strand Control Cable 12-Core 1.5 sq.mm",
                description="Annealed bare copper conductor, PVC insulated and sheathed, colour coded cores",
                category="Cables & Wiring",
                unit="METERS",
                hsn_code="85444999",
                unit_selling_price=165.0,
                unit_cost=125.0,
                stock_quantity=420,
                reorder_threshold=100
            ),
            Product(
                business_id=business.id,
                sku="IND-PCK-001",
                name="High-Tension Heavy Duty BoPP Packaging Tape 2 Inch x 65M",
                description="45 Micron industrial grade clear adhesive sealing tape, high shear strength",
                category="Packaging Materials",
                unit="BOXES",
                hsn_code="39191000",
                unit_selling_price=1850.0,
                unit_cost=1350.0,
                stock_quantity=75,
                reorder_threshold=20
            ),
            Product(
                business_id=business.id,
                sku="IND-PCK-002",
                name="Cast Stretch Wrap Film 23 Micron 500mm x 3Kg",
                description="High clarity manual pallet wrapping stretch film, puncture resistant, 300% elongation",
                category="Packaging Materials",
                unit="BOXES",
                hsn_code="39201019",
                unit_selling_price=2400.0,
                unit_cost=1800.0,
                stock_quantity=40,
                reorder_threshold=12
            ),
            Product(
                business_id=business.id,
                sku="IND-FAS-001",
                name="Stainless Steel Hex Bolt M12 x 50mm (Grade 304)",
                description="Full threaded hex head bolt with matching nut and washer, rust resistant",
                category="Fasteners & Hardware",
                unit="BOXES",
                hsn_code="73181500",
                unit_selling_price=950.0,
                unit_cost=680.0,
                stock_quantity=80,
                reorder_threshold=25
            ),
            Product(
                business_id=business.id,
                sku="IND-FAS-002",
                name="High Tensile Allen Cap Screw M8 x 30mm (Grade 12.9)",
                description="Socket head cap screw, black oxide finish, dynamic load endurance for machinery",
                category="Fasteners & Hardware",
                unit="BOXES",
                hsn_code="73181500",
                unit_selling_price=720.0,
                unit_cost=490.0,
                stock_quantity=110,
                reorder_threshold=30
            ),
            Product(
                business_id=business.id,
                sku="IND-BRG-001",
                name="Deep Groove Ball Bearing 6205-2RS",
                description="Rubber sealed both sides, pre-lubricated with high temperature grease, chrome steel",
                category="Bearings & Transmission",
                unit="PCS",
                hsn_code="84821011",
                unit_selling_price=280.0,
                unit_cost=185.0,
                stock_quantity=120,
                reorder_threshold=35
            ),
            Product(
                business_id=business.id,
                sku="IND-BRG-002",
                name="Taper Roller Bearing 32210",
                description="Heavy radial and axial load capacity, precision ground raceway, industrial standard",
                category="Bearings & Transmission",
                unit="PCS",
                hsn_code="84822011",
                unit_selling_price=1150.0,
                unit_cost=780.0,
                stock_quantity=28,
                reorder_threshold=8
            ),
            Product(
                business_id=business.id,
                sku="IND-VLV-001",
                name="Stainless Steel 2-Piece Ball Valve 1 Inch BSP",
                description="SS316 body and ball, PTFE seats, 1000 PSI WOG rating, lever operated",
                category="Pipes & Valves",
                unit="PCS",
                hsn_code="84818030",
                unit_selling_price=1650.0,
                unit_cost=1180.0,
                stock_quantity=30,
                reorder_threshold=8
            )
        ]
        db.add_all(sample_products)
        db.flush()

        print("[*] Creating Sample MSME Customers...")
        cust1 = Customer(
            business_id=business.id,
            name="Rajesh Sharma",
            company_name="Kalyani Precision Engineering Works",
            email="rajesh@kalyaniprecision.in",
            phone="9822014782",
            gstin="27AAEFK4921E1ZR",
            billing_address="Gat No. 128, Chakan Industrial Phase 2",
            shipping_address="Gat No. 128, Chakan Industrial Phase 2",
            city="Chakan, Pune",
            state="Maharashtra",
            pincode="410501"
        )
        cust2 = Customer(
            business_id=business.id,
            name="Anand Joshi",
            company_name="Sahyadri Agro-Processing Equipment Ltd",
            email="ajoshi@sahyadriagro.com",
            phone="9860334412",
            gstin="27AAGCS9982L1Z9",
            billing_address="Plot 55, Baramati MIDC",
            shipping_address="Plot 55, Baramati MIDC",
            city="Baramati",
            state="Maharashtra",
            pincode="413133"
        )
        cust3 = Customer(
            business_id=business.id,
            name="Mohit Agarwal",
            company_name="Vardhman Auto Components Pvt. Ltd.",
            email="procurement@vardhmanauto.in",
            phone="9910283746",
            gstin="06AABCV7712M1Z8",  # Haryana GSTIN for inter-state demo
            billing_address="Sector 24, Industrial Area",
            shipping_address="Sector 24, Industrial Area",
            city="Faridabad",
            state="Haryana",
            pincode="121005"
        )
        cust4 = Customer(
            business_id=business.id,
            name="Sunil Patil",
            company_name="Patil Agro Pumps & Sprinklers",
            email="patil.agropumps@gmail.com",
            phone="9422081190",
            gstin=None,  # Unregistered small dealer
            billing_address="Old Station Road, Miraj",
            city="Sangli",
            state="Maharashtra",
            pincode="416410"
        )
        db.add_all([cust1, cust2, cust3, cust4])
        db.flush()

        print("[*] Creating Sample Enquiries...")
        enquiry1 = Enquiry(
            business_id=business.id,
            customer_id=cust1.id,
            customer_name_raw="Rajesh Sharma",
            customer_contact_raw="rajesh@kalyaniprecision.in, 9822014782",
            title="RFQ: Urgent Induction Motors and Pneumatic Cylinders for New Line",
            source="email",
            raw_text="""Dear Apex Industrial Team,
We urgently require the following items for our Chakan assembly unit commissioning next week:
1. 3-Phase Induction Motor 5HP 1440 RPM - 4 Nos
2. Heavy Duty Pneumatic Cylinder 50mm bore - 8 Nos
3. 5/2 Way Solenoid Valve 24V DC - 10 Nos
Please quote your best rate with GST and delivery lead time to Chakan MIDC.
Regards,
Rajesh Sharma
Kalyani Precision Engineering Works""",
            ai_processed=True,
            ai_model_used="VyaparPilot Rule-Based Verified NLP Engine (Demo Mode)",
            extracted_data_json=json.dumps({
                "customer_name": "Rajesh Sharma",
                "company_name": "Kalyani Precision Engineering Works",
                "delivery_location": "Chakan MIDC, Pune",
                "requested_items": [
                    {"product_query": "3-Phase Induction Motor 5HP 1440 RPM", "quantity": 4, "unit": "PCS"},
                    {"product_query": "Heavy Duty Pneumatic Cylinder 50mm bore", "quantity": 8, "unit": "PCS"},
                    {"product_query": "5/2 Way Solenoid Valve 24V DC", "quantity": 10, "unit": "PCS"}
                ]
            }),
            status="quotation_created"
        )
        enquiry2 = Enquiry(
            business_id=business.id,
            customer_id=cust2.id,
            customer_name_raw="Anand Joshi",
            customer_contact_raw="9860334412",
            title="WhatsApp Enquiry: Control Cables & Power Contactors",
            source="whatsapp",
            raw_text="""Hi Vikram, Need urgent rate for Baramati plant:
100 meters 4-Core 4.0 sq.mm Copper Armoured Power Cable
5 nos 3-Pole Power Contactor 32A 230V Coil
Delivery required within 3 days. Send quote with GST. Thanks, Anand Joshi, Sahyadri Agro""",
            ai_processed=True,
            ai_model_used="VyaparPilot Rule-Based Verified NLP Engine (Demo Mode)",
            extracted_data_json=json.dumps({
                "customer_name": "Anand Joshi",
                "company_name": "Sahyadri Agro-Processing Equipment Ltd",
                "delivery_location": "Baramati MIDC",
                "requested_items": [
                    {"product_query": "4-Core 4.0 sq.mm Copper Armoured Power Cable", "quantity": 100, "unit": "METERS"},
                    {"product_query": "3-Pole Power Contactor 32A 230V Coil", "quantity": 5, "unit": "PCS"}
                ]
            }),
            status="quotation_created"
        )
        db.add_all([enquiry1, enquiry2])
        db.flush()

        print("[*] Creating Seed Quotations in Various Lifecycle Statuses...")
        # Quote 1: Approved Quotation
        q1 = Quotation(
            business_id=business.id,
            customer_id=cust1.id,
            enquiry_id=enquiry1.id,
            created_by_user_id=demo_user.id,
            approved_by_user_id=demo_user.id,
            quotation_number="VP-2026-0001",
            title="Commissioning Supplies - Motors & Pneumatics",
            status="APPROVED",
            currency="INR",
            subtotal=130300.0,
            discount_amount=6515.0,
            discount_percentage=5.0,
            tax_rate=18.0,
            tax_amount=22281.3,
            tax_type="INTRA_STATE_GST",
            delivery_charge=1500.0,
            grand_total=147566.3,
            total_cost=95500.0,
            estimated_gross_margin_pct=22.8,
            valid_until=datetime.now(timezone.utc) + timedelta(days=25),
            payment_terms="50% advance along with PO, 50% against proforma invoice before dispatch.",
            delivery_terms="Ex-works Bhosari warehouse. Freight included for Chakan delivery.",
            notes="Warranty: 12 months manufacturer warranty against manufacturing defects.",
            approved_at=datetime.now(timezone.utc) - timedelta(days=2),
            has_guardrail_warnings=False
        )
        db.add(q1)
        db.flush()

        item1_1 = QuotationItem(
            quotation_id=q1.id,
            product_id=sample_products[0].id,
            sku="IND-MTR-001",
            name="Three-Phase Induction Motor 5HP 1440 RPM",
            description="TEFC Squirrel Cage 415V, Foot Mounted, IE2",
            quantity=4.0,
            unit="PCS",
            unit_price=18500.0,
            unit_cost=14200.0,
            discount_pct=0.0,
            line_total=74000.0,
            verification_status="VERIFIED_EXACT",
            match_confidence=1.0,
            stock_available=18
        )
        item1_2 = QuotationItem(
            quotation_id=q1.id,
            product_id=sample_products[3].id,
            sku="IND-PNE-001",
            name="Heavy Duty Pneumatic Cylinder 50mm Bore",
            description="Double acting pneumatic cylinder, 200mm stroke",
            quantity=8.0,
            unit="PCS",
            unit_price=4850.0,
            unit_cost=3400.0,
            discount_pct=0.0,
            line_total=38800.0,
            verification_status="VERIFIED_EXACT",
            match_confidence=0.98,
            stock_available=35
        )
        item1_3 = QuotationItem(
            quotation_id=q1.id,
            product_id=sample_products[4].id,
            sku="IND-PNE-002",
            name="5/2 Way Solenoid Valve 24V DC",
            description="G 1/4 inch port, single solenoid pilot operated",
            quantity=10.0,
            unit="PCS",
            unit_price=1750.0,
            unit_cost=1150.0,
            discount_pct=0.0,
            line_total=17500.0,
            verification_status="VERIFIED_EXACT",
            match_confidence=1.0,
            stock_available=50
        )
        db.add_all([item1_1, item1_2, item1_3])

        # Quote 2: Pending Approval
        q2 = Quotation(
            business_id=business.id,
            customer_id=cust2.id,
            enquiry_id=enquiry2.id,
            created_by_user_id=sales_rep.id,
            quotation_number="VP-2026-0002",
            title="Baramati Plant Wiring & Contactors",
            status="PENDING_APPROVAL",
            currency="INR",
            subtotal=26750.0,
            discount_amount=0.0,
            discount_percentage=0.0,
            tax_rate=18.0,
            tax_amount=4815.0,
            tax_type="INTRA_STATE_GST",
            delivery_charge=500.0,
            grand_total=32065.0,
            total_cost=20400.0,
            estimated_gross_margin_pct=23.7,
            valid_until=datetime.now(timezone.utc) + timedelta(days=20),
            payment_terms="100% advance against PI before dispatch.",
            delivery_terms="Door delivery to Baramati MIDC.",
            notes="Ready stock available for immediate dispatch.",
            has_guardrail_warnings=False
        )
        db.add(q2)
        db.flush()

        item2_1 = QuotationItem(
            quotation_id=q2.id,
            product_id=sample_products[9].id,
            sku="IND-CAB-001",
            name="4-Core 4.0 sq.mm Copper Armoured Power Cable",
            description="1100V XLPE insulated, round aluminium wire armoured (AWA)",
            quantity=100.0,
            unit="METERS",
            unit_price=195.0,
            unit_cost=155.0,
            discount_pct=0.0,
            line_total=19500.0,
            verification_status="VERIFIED_EXACT",
            match_confidence=1.0,
            stock_available=650
        )
        item2_2 = QuotationItem(
            quotation_id=q2.id,
            product_id=sample_products[6].id,
            sku="IND-ELE-001",
            name="3-Pole Power Contactor 32A 230V Coil",
            description="AC-3 duty 15kW/20HP rating, DIN rail mountable",
            quantity=5.0,
            unit="PCS",
            unit_price=1450.0,
            unit_cost=980.0,
            discount_pct=0.0,
            line_total=7250.0,
            verification_status="VERIFIED_EXACT",
            match_confidence=1.0,
            stock_available=60
        )
        db.add_all([item2_1, item2_2])

        # Quote 3: Needs Review (Triggering guardrail warnings for stock & margin)
        q3 = Quotation(
            business_id=business.id,
            customer_id=cust3.id,
            created_by_user_id=sales_rep.id,
            quotation_number="VP-2026-0003",
            title="Bulk Order - VFD Drives & Motors (Inter-state)",
            status="NEEDS_REVIEW",
            currency="INR",
            subtotal=417800.0,
            discount_amount=20890.0,
            discount_percentage=5.0,
            tax_rate=18.0,
            tax_amount=71443.8,
            tax_type="INTER_STATE_IGST",
            delivery_charge=4500.0,
            grand_total=472853.8,
            total_cost=349200.0,
            estimated_gross_margin_pct=12.1,  # Below 15% minimum margin guardrail!
            valid_until=datetime.now(timezone.utc) + timedelta(days=15),
            payment_terms="25% advance, balance 75% on LC at sight.",
            delivery_terms="Transporter godown delivery, Faridabad.",
            notes="Requires special inter-state transit e-Way bill.",
            has_guardrail_warnings=True,
            guardrail_warnings_json=json.dumps([
                {
                    "code": "LOW_OVERALL_MARGIN",
                    "severity": "CRITICAL",
                    "item_name": "Total Quotation",
                    "message": "Overall gross margin 12.1% is below company target of 15.0%. Requires management sign-off.",
                    "data": {"margin_pct": 12.1, "min_margin": 15.0}
                },
                {
                    "code": "INSUFFICIENT_STOCK",
                    "severity": "WARNING",
                    "item_name": "Variable Frequency Drive (VFD) 7.5kW 10HP",
                    "message": "Requested 10 PCS, but only 6 available in warehouse stock.",
                    "data": {"requested": 10, "stock": 6}
                }
            ])
        )
        db.add(q3)
        db.flush()

        item3_1 = QuotationItem(
            quotation_id=q3.id,
            product_id=sample_products[8].id,
            sku="IND-ELE-003",
            name="Variable Frequency Drive (VFD) 7.5kW 10HP",
            description="3-Phase 415V, sensorless vector control",
            quantity=10.0,  # 10 requested, only 6 in stock!
            unit="PCS",
            unit_price=28900.0,
            unit_cost=22400.0,
            discount_pct=0.0,
            line_total=289000.0,
            verification_status="VERIFIED_EXACT",
            match_confidence=1.0,
            stock_available=6,
            has_stock_warning=True,
            warning_details="Requested 10 PCS, stock has 6."
        )
        item3_2 = QuotationItem(
            quotation_id=q3.id,
            product_id=sample_products[1].id,
            sku="IND-MTR-002",
            name="Three-Phase Induction Motor 10HP 1440 RPM",
            description="Cast iron frame, IP55, Flange mounted",
            quantity=4.0,
            unit="PCS",
            unit_price=32200.0,
            unit_cost=25800.0,
            discount_pct=0.0,
            line_total=128800.0,
            verification_status="VERIFIED_EXACT",
            match_confidence=1.0,
            stock_available=8
        )
        db.add_all([item3_1, item3_2])

        # Quote 4: Draft Quotation
        q4 = Quotation(
            business_id=business.id,
            customer_id=cust4.id,
            created_by_user_id=demo_user.id,
            quotation_number="VP-2026-0004",
            title="Pumps and Fasteners Draft",
            status="DRAFT",
            currency="INR",
            subtotal=24300.0,
            discount_amount=0.0,
            discount_percentage=0.0,
            tax_rate=18.0,
            tax_amount=4374.0,
            tax_type="INTRA_STATE_GST",
            delivery_charge=0.0,
            grand_total=28674.0,
            total_cost=18560.0,
            estimated_gross_margin_pct=23.6,
            valid_until=datetime.now(timezone.utc) + timedelta(days=30),
            payment_terms=settings.default_payment_terms,
            delivery_terms=settings.default_delivery_terms,
            notes="Customer requesting delivery to Miraj.",
            has_guardrail_warnings=False
        )
        db.add(q4)
        db.flush()

        item4_1 = QuotationItem(
            quotation_id=q4.id,
            product_id=sample_products[2].id,
            sku="IND-PMP-001",
            name="Centrifugal Monoblock Water Pump 2HP",
            description="Single phase 230V, 50Hz, 32x25mm delivery size",
            quantity=2.0,
            unit="PCS",
            unit_price=11200.0,
            unit_cost=8600.0,
            discount_pct=0.0,
            line_total=22400.0,
            verification_status="VERIFIED_EXACT",
            match_confidence=1.0,
            stock_available=22
        )
        item4_2 = QuotationItem(
            quotation_id=q4.id,
            product_id=sample_products[13].id,
            sku="IND-FAS-001",
            name="Stainless Steel Hex Bolt M12 x 50mm (Grade 304)",
            description="Full threaded hex head bolt, Grade 304",
            quantity=2.0,
            unit="BOXES",
            unit_price=950.0,
            unit_cost=680.0,
            discount_pct=0.0,
            line_total=1900.0,
            verification_status="VERIFIED_EXACT",
            match_confidence=1.0,
            stock_available=80
        )
        db.add_all([item4_1, item4_2])

        # Quote 5: Rejected Quotation
        q5 = Quotation(
            business_id=business.id,
            customer_id=cust1.id,
            created_by_user_id=sales_rep.id,
            quotation_number="VP-2026-0005",
            title="Experimental High-Discount Package",
            status="REJECTED",
            currency="INR",
            subtotal=74000.0,
            discount_amount=22200.0,
            discount_percentage=30.0,  # 30% discount exceeds 20% limit!
            tax_rate=18.0,
            tax_amount=9324.0,
            tax_type="INTRA_STATE_GST",
            delivery_charge=0.0,
            grand_total=61124.0,
            total_cost=56800.0,
            estimated_gross_margin_pct=-9.6,  # Negative margin!
            rejection_reason="Excessive 30% discount results in negative gross margin (-9.6%). Underpricing rule strictly violated.",
            has_guardrail_warnings=True,
            guardrail_warnings_json=json.dumps([
                {
                    "code": "HIGH_OVERALL_DISCOUNT",
                    "severity": "WARNING",
                    "message": "30% discount violates maximum company policy threshold of 20%."
                }
            ])
        )
        db.add(q5)
        db.flush()

        # Approval Events
        appr1 = ApprovalEvent(
            quotation_id=q1.id,
            user_id=demo_user.id,
            user_name=demo_user.full_name,
            action="APPROVE",
            comments="Verified catalogue prices, stock levels confirmed at Bhosari warehouse. Approved for issue.",
            created_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        appr2 = ApprovalEvent(
            quotation_id=q2.id,
            user_id=sales_rep.id,
            user_name=sales_rep.full_name,
            action="SUBMIT",
            comments="Submitted quote for urgent Baramati delivery. Stock ready.",
            created_at=datetime.now(timezone.utc) - timedelta(hours=4)
        )
        appr5 = ApprovalEvent(
            quotation_id=q5.id,
            user_id=demo_user.id,
            user_name=demo_user.full_name,
            action="REJECT",
            comments="Rejected due to negative gross margin. Revise discount to maximum 8%.",
            created_at=datetime.now(timezone.utc) - timedelta(days=5)
        )
        db.add_all([appr1, appr2, appr5])

        print("[*] Creating Seed Productivity Measurements (ROI Module)...")
        # Record realistic measurements spanning the last few weeks
        roi_records = [
            ProductivityMeasurement(
                business_id=business.id,
                quotation_id=q1.id,
                enquiry_id=enquiry1.id,
                manual_baseline_seconds=2100.0,  # 35 min
                ai_processing_seconds=14.2,      # 14.2s
                human_review_seconds=115.0,      # ~2 min
                correction_seconds=30.0,         # 30s
                total_ai_assisted_seconds=159.2, # ~2.65 min
                time_saved_seconds=1940.8,       # 32.3 min saved
                time_reduction_pct=92.4,         # 92.4% reduction
                fields_corrected_count=0,
                validation_errors_caught_count=0,
                labour_cost_per_hour=350.0,
                estimated_labour_value_saved=188.69,
                ai_operating_cost=0.50,
                net_benefit=188.19,
                is_demo_data=True,
                measurement_type="DEMO_SEEDED",
                notes="Seeded demo measurement: Motors & Pneumatics commissioning enquiry",
                created_at=datetime.now(timezone.utc) - timedelta(days=2)
            ),
            ProductivityMeasurement(
                business_id=business.id,
                quotation_id=q2.id,
                enquiry_id=enquiry2.id,
                manual_baseline_seconds=1800.0,  # 30 min
                ai_processing_seconds=11.8,
                human_review_seconds=85.0,
                correction_seconds=15.0,
                total_ai_assisted_seconds=111.8,
                time_saved_seconds=1688.2,
                time_reduction_pct=93.8,
                fields_corrected_count=0,
                validation_errors_caught_count=0,
                labour_cost_per_hour=350.0,
                estimated_labour_value_saved=164.13,
                ai_operating_cost=0.50,
                net_benefit=163.63,
                is_demo_data=True,
                measurement_type="DEMO_SEEDED",
                notes="Seeded demo measurement: Cable & Contactor WhatsApp enquiry",
                created_at=datetime.now(timezone.utc) - timedelta(hours=4)
            ),
            ProductivityMeasurement(
                business_id=business.id,
                quotation_id=q3.id,
                manual_baseline_seconds=2700.0,  # 45 min
                ai_processing_seconds=18.5,
                human_review_seconds=190.0,
                correction_seconds=95.0,
                total_ai_assisted_seconds=303.5,
                time_saved_seconds=2396.5,
                time_reduction_pct=88.8,
                fields_corrected_count=2,
                validation_errors_caught_count=2,  # Caught insufficient stock and low margin!
                labour_cost_per_hour=350.0,
                estimated_labour_value_saved=232.99,
                ai_operating_cost=0.50,
                net_benefit=232.49,
                is_demo_data=True,
                measurement_type="DEMO_SEEDED",
                notes="Seeded demo measurement: Multi-item bulk quotation with pricing guardrail triggers",
                created_at=datetime.now(timezone.utc) - timedelta(days=1)
            ),
            ProductivityMeasurement(
                business_id=business.id,
                manual_baseline_seconds=2400.0,  # 40 min
                ai_processing_seconds=15.0,
                human_review_seconds=130.0,
                correction_seconds=20.0,
                total_ai_assisted_seconds=165.0,
                time_saved_seconds=2235.0,
                time_reduction_pct=93.1,
                fields_corrected_count=1,
                validation_errors_caught_count=1,
                labour_cost_per_hour=350.0,
                estimated_labour_value_saved=217.29,
                ai_operating_cost=0.50,
                net_benefit=216.79,
                is_demo_data=True,
                measurement_type="DEMO_SEEDED",
                notes="Seeded demo measurement: Stainless steel valves and fittings tender",
                created_at=datetime.now(timezone.utc) - timedelta(days=4)
            ),
            ProductivityMeasurement(
                business_id=business.id,
                manual_baseline_seconds=2100.0,  # 35 min
                ai_processing_seconds=12.0,
                human_review_seconds=100.0,
                correction_seconds=40.0,
                total_ai_assisted_seconds=152.0,
                time_saved_seconds=1948.0,
                time_reduction_pct=92.8,
                fields_corrected_count=1,
                validation_errors_caught_count=0,
                labour_cost_per_hour=350.0,
                estimated_labour_value_saved=189.39,
                ai_operating_cost=0.50,
                net_benefit=188.89,
                is_demo_data=True,
                measurement_type="DEMO_SEEDED",
                notes="Seeded demo measurement: Packaging materials batch order",
                created_at=datetime.now(timezone.utc) - timedelta(days=6)
            )
        ]
        db.add_all(roi_records)

        print("[*] Creating Seed Audit Trail...")
        audit_events = [
            AuditEvent(
                business_id=business.id,
                event_type="BUSINESS_REGISTERED",
                user_email=demo_user.email,
                description=f"Workspace registered for '{business.name}' with owner {demo_user.full_name}.",
                created_at=datetime.now(timezone.utc) - timedelta(days=10)
            ),
            AuditEvent(
                business_id=business.id,
                event_type="PRODUCTS_CSV_IMPORTED",
                user_email=demo_user.email,
                description="Imported 18 verified industrial products into catalogue.",
                created_at=datetime.now(timezone.utc) - timedelta(days=9)
            ),
            AuditEvent(
                business_id=business.id,
                event_type="ENQUIRY_CREATED",
                user_email=demo_user.email,
                description="Created customer enquiry 'RFQ: Urgent Induction Motors and Pneumatic Cylinders for New Line'.",
                created_at=datetime.now(timezone.utc) - timedelta(days=3)
            ),
            AuditEvent(
                business_id=business.id,
                quotation_id=q1.id,
                user_email=demo_user.email,
                event_type="QUOTATION_CREATED",
                description="Quotation VP-2026-0001 generated with 3 verified catalogue items.",
                created_at=datetime.now(timezone.utc) - timedelta(days=3)
            ),
            AuditEvent(
                business_id=business.id,
                quotation_id=q1.id,
                user_email=demo_user.email,
                event_type="QUOTATION_APPROVED",
                description="Quotation VP-2026-0001 officially APPROVED by Vikramaditya Deshmukh.",
                created_at=datetime.now(timezone.utc) - timedelta(days=2)
            ),
            AuditEvent(
                business_id=business.id,
                quotation_id=q1.id,
                user_email=demo_user.email,
                event_type="PDF_GENERATED",
                description="Exported official quotation PDF for VP-2026-0001.",
                created_at=datetime.now(timezone.utc) - timedelta(days=2)
            ),
            AuditEvent(
                business_id=business.id,
                quotation_id=q3.id,
                user_email=sales_rep.email,
                event_type="GUARDRAIL_TRIGGERED",
                description="Guardrail alert: Low gross margin (12.1%) and stock shortage on VFD-7.5kW.",
                created_at=datetime.now(timezone.utc) - timedelta(days=1)
            ),
            AuditEvent(
                business_id=business.id,
                quotation_id=q5.id,
                user_email=demo_user.email,
                event_type="QUOTATION_REJECTED",
                description="Quotation VP-2026-0005 rejected by owner: negative margin violation.",
                created_at=datetime.now(timezone.utc) - timedelta(days=5)
            )
        ]
        db.add_all(audit_events)

        db.commit()
        print("\n=======================================================")
        print("  VYAPARPILOT AI DEMO DATABASE SEEDED SUCCESSFULLY!    ")
        print("=======================================================")
        print("  Demo Business:  Apex Industrial & Electro-Mech Solutions")
        print("  Demo Email:     demo@vyaparpilot.in")
        print("  Demo Password:  demoPassword123!")
        print("  Products:       18 active catalogue items with INR prices")
        print("  Quotations:     5 quotations across all lifecycle statuses")
        print("  ROI Records:    5 verifiable productivity measurements")
        print("  Audit Events:   8 historical tamper-evident event logs")
        print("=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"[!] Error seeding database: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
