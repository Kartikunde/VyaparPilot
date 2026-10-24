import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from app.models.quotation import Quotation
from app.models.business import Business
from app.models.customer import Customer
from app.models.settings import BusinessSettings

class NumberedCanvas(canvas.Canvas):
    """Adds page numbers and footer to all pages dynamically."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Footer text
        footer_text = f"VyaparPilot AI Verified Document | Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 36, 25, footer_text)
        self.drawString(36, 25, "Computer generated quotation. Verified and approved via digital audit trail.")
        
        # Thin divider rule above footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 35, A4[0] - 36, 35)
        self.restoreState()

def generate_quotation_pdf(
    quotation: Quotation,
    business: Business,
    customer: Customer,
    settings: BusinessSettings
) -> io.BytesIO:
    """
    Generates a professional, branded quotation PDF using ReportLab.
    Returns in-memory BytesIO buffer.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a')
    )
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569')
    )
    quote_num_style = ParagraphStyle(
        'QuoteNum',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        alignment=2,  # Right align
        textColor=colors.HexColor('#0067c9')
    )
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#1e293b')
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#334155')
    )
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#1e293b')
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#0f172a')
    )
    table_cell_right = ParagraphStyle(
        'TableCellRight',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        alignment=2,
        textColor=colors.HexColor('#1e293b')
    )

    story = []

    # 1. Header: Business Info & Quotation Details
    header_data = [
        [
            Paragraph(f"<b>{business.name}</b><br/>{business.tagline or 'Industrial & Commercial Solutions'}<br/>{business.address}, {business.city}, {business.state} - {business.pincode}<br/>Phone: {business.phone} | Email: {business.email}<br/>GSTIN: {business.gstin or 'N/A'}", subtitle_style),
            Paragraph(f"<font color='#0067c9'><b>ESTIMATE / QUOTATION</b></font><br/><b>Quote #:</b> {quotation.quotation_number}<br/><b>Date:</b> {quotation.created_at.strftime('%d-%b-%Y')}<br/><b>Valid Until:</b> {(quotation.valid_until.strftime('%d-%b-%Y') if quotation.valid_until else '30 Days from issue')}<br/><b>Status:</b> <font color='{'#16a34a' if quotation.status == 'APPROVED' else '#ea580c'}'><b>{quotation.status}</b></font>", subtitle_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[310, 212])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0067c9'), spaceBefore=6, spaceAfter=8))

    # 2. Customer Details Card
    customer_data = [
        [
            Paragraph("<b>QUOTATION TO:</b>", section_title),
            Paragraph("<b>DELIVERY & DISPATCH DETAILS:</b>", section_title)
        ],
        [
            Paragraph(f"<b>{customer.company_name}</b><br/>Attn: {customer.name}<br/>{customer.billing_address or customer.city or 'N/A'}<br/>Phone: {customer.phone}<br/>Email: {customer.email or 'N/A'}<br/>GSTIN: {customer.gstin or 'Unregistered / Inter-state'}", body_style),
            Paragraph(f"<b>Shipping Address:</b> {customer.shipping_address or customer.billing_address or 'As per billing'}<br/><b>Delivery Terms:</b> {quotation.delivery_terms or settings.default_delivery_terms}<br/><b>Tax Classification:</b> {quotation.tax_type.replace('_', ' ')}", body_style)
        ]
    ]
    customer_table = Table(customer_data, colWidths=[261, 261])
    customer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(customer_table)
    story.append(Spacer(1, 10))

    # 3. Product Line Items Table
    headers = [
        Paragraph("#", table_header_style),
        Paragraph("SKU / Item Description", table_header_style),
        Paragraph("Qty", table_header_style),
        Paragraph("Unit", table_header_style),
        Paragraph("Unit Price (₹)", table_header_style),
        Paragraph("Disc %", table_header_style),
        Paragraph("Total (₹)", table_header_style),
    ]
    table_rows = [headers]

    for idx, item in enumerate(quotation.items, 1):
        sku_txt = f"<font color='#0067c9'><b>[{item.sku}]</b></font> " if item.sku else ""
        desc_txt = f"{sku_txt}<b>{item.name}</b>"
        if item.description:
            desc_txt += f"<br/><font color='#64748b' size='7'>{item.description[:100]}</font>"
        
        table_rows.append([
            Paragraph(str(idx), table_cell_style),
            Paragraph(desc_txt, table_cell_style),
            Paragraph(f"{item.quantity:g}", table_cell_right),
            Paragraph(item.unit, table_cell_style),
            Paragraph(f"{item.unit_price:,.2f}", table_cell_right),
            Paragraph(f"{item.discount_pct:g}%" if item.discount_pct > 0 else "-", table_cell_right),
            Paragraph(f"{item.line_total:,.2f}", table_cell_right),
        ])

    items_table = Table(table_rows, colWidths=[20, 222, 45, 45, 65, 45, 80])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 8))

    # 4. Financial Calculations Breakdown
    subtotal_val = f"₹ {quotation.subtotal:,.2f}"
    discount_val = f"- ₹ {quotation.discount_amount:,.2f}" if quotation.discount_amount > 0 else "₹ 0.00"
    tax_label = f"GST ({quotation.tax_rate:g}%)"
    if quotation.tax_type == "INTRA_STATE_GST":
        tax_label = f"CGST ({(quotation.tax_rate/2):g}%) + SGST ({(quotation.tax_rate/2):g}%)"
    else:
        tax_label = f"IGST ({quotation.tax_rate:g}%)"
    
    tax_val = f"₹ {quotation.tax_amount:,.2f}"
    delivery_val = f"₹ {quotation.delivery_charge:,.2f}"
    grand_total_val = f"₹ {quotation.grand_total:,.2f}"

    totals_data = [
        [
            Paragraph("<b>Bank & Payment Details:</b><br/>"
                      f"Bank: {business.bank_name or 'HDFC Bank Ltd'}<br/>"
                      f"A/C No: {business.bank_account_no or '50200084729103'}<br/>"
                      f"IFSC: {business.bank_ifsc or 'HDFC0001234'}<br/>"
                      f"PAN: {business.pan or 'AAACB1234D'}", body_style),
            Table([
                [Paragraph("Subtotal:", table_cell_style), Paragraph(subtotal_val, table_cell_right)],
                [Paragraph(f"Discount ({quotation.discount_percentage:g}%):", table_cell_style), Paragraph(discount_val, table_cell_right)],
                [Paragraph(f"{tax_label}:", table_cell_style), Paragraph(tax_val, table_cell_right)],
                [Paragraph("Freight / Delivery Charges:", table_cell_style), Paragraph(delivery_val, table_cell_right)],
                [Paragraph("<b>Grand Total (INR):</b>", table_cell_bold), Paragraph(f"<b>{grand_total_val}</b>", ParagraphStyle('GT', parent=table_cell_right, fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#0067c9')))],
            ], colWidths=[130, 110], style=[
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 3),
                ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#0067c9')),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0f7ff')),
            ])
        ]
    ]
    totals_table = Table(totals_data, colWidths=[282, 240])
    totals_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 10))

    # 5. Terms & Signature Block
    terms_text = (
        f"<b>Payment Terms:</b> {quotation.payment_terms or settings.default_payment_terms}<br/>"
        f"<b>Delivery Terms:</b> {quotation.delivery_terms or settings.default_delivery_terms}<br/>"
        f"<b>Notes:</b> {quotation.notes or 'Material warranty as per standard manufacturer guidelines.'}"
    )
    terms_data = [
        [
            Paragraph(f"<b>Terms & Conditions:</b><br/>{terms_text}", body_style),
            Paragraph(f"<b>For {business.name}</b><br/><br/><br/>"
                      f"<b>Authorized Signatory</b><br/>"
                      f"<font color='#16a34a'><b>Digitally Verified & Approved</b></font><br/>"
                      f"Date: {quotation.approved_at.strftime('%d-%b-%Y') if quotation.approved_at else quotation.created_at.strftime('%d-%b-%Y')}", subtitle_style)
        ]
    ]
    terms_table = Table(terms_data, colWidths=[360, 162])
    terms_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (0, 0), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
    ]))
    story.append(KeepTogether(terms_table))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
