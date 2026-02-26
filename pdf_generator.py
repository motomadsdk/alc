"""
PDF Flowchart Generation Module
Generates professional flowchart representations of signal chains.
"""
import io
from datetime import datetime
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib import colors
from reportlab.lib.units import inch, mm
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import logging

logger = logging.getLogger(__name__)

# Color scheme for protocols
PROTOCOL_COLORS = {
    'analog': colors.HexColor('#FF6B6B'),
    'aes3': colors.HexColor('#4ECDC4'),
    'dante': colors.HexColor('#45B7D1'),
    'avb': colors.HexColor('#96CEB4'),
    'aes67': colors.HexColor('#FFEAA7'),
    'optocore': colors.HexColor('#DDA15E'),
    'madi': colors.HexColor('#BC6C25'),
    'default': colors.HexColor('#95A5A6'),
}


from config import Config
import os
from PIL import Image
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF

def get_protocol_color(protocol_name: str) -> colors.Color:
    """Get color for protocol type."""
    if not protocol_name:
        return PROTOCOL_COLORS['default']
    
    protocol = protocol_name.lower().strip()
    return PROTOCOL_COLORS.get(protocol, PROTOCOL_COLORS['default'])


def generate_flowchart_pdf(chain_data: list, total_latency: float) -> bytes:
    """
    Generate a professional flowchart PDF from signal chain data.
    """
    try:
        buf = io.BytesIO()
        # Create PDF with landscape orientation
        c = canvas.Canvas(buf, pagesize=landscape(A4))
        width, height = landscape(A4)
        
        # Draw Header
        title_str = f"MOTO ALC SIGNAL FLOWCHART ({datetime.now().strftime('%d-%m-%Y %H:%M')})"
        c.setFillColor(colors.HexColor('#323d4d')) # Dark blue/gray requested by user
        c.rect(0, height - 30, width, 30, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(width / 2, height - 20, title_str)
        
        if not chain_data:
            c.setFont("Helvetica", 12)
            c.setFillColor(colors.black)
            c.drawString(50, height - 80, "No devices in signal chain.")
            c.save()
            buf.seek(0)
            return buf.getvalue()

        # Layout settings
        margin_x = 80
        margin_y = 120
        node_radius = 40
        x_spacing = 160
        y_spacing = 140
        
        nodes_per_row = int((width - margin_x*2 + x_spacing) // x_spacing)
        if nodes_per_row < 1:
            nodes_per_row = 1
            
        # Pre-calculate positions
        positions = []
        for i in range(len(chain_data)):
            row = i // nodes_per_row
            col = i % nodes_per_row
            
            # Snake direction (left to right, then right to left)
            if row % 2 == 1:
                col = (nodes_per_row - 1) - col
                
            x = margin_x + col * x_spacing
            y = height - margin_y - row * y_spacing
            positions.append((x, y))

        # Draw Start block
        if positions:
            x, y = positions[0]
            c.setFillColor(colors.HexColor('#00D9FF'))
            c.roundRect(x - node_radius - 40, y - 20, 20, 40, 5, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 10)
            c.saveState()
            c.translate(x - node_radius - 30, y)
            c.rotate(90)
            c.drawCentredString(0, -3, "START")
            c.restoreState()
            
            # Line from Start to first node
            c.setStrokeColor(colors.HexColor('#00D9FF'))
            c.setLineWidth(2)
            c.line(x - node_radius - 20, y, x, y)
            
        # Draw solid paths (Segments with protocol colors)
        c.setLineWidth(2)
        
        for i in range(len(chain_data)):
            x, y = positions[i]
            device = chain_data[i]
            output_proto = device.get('raw_data', {}).get('output_type', '-')
            path_color = get_protocol_color(output_proto)
            
            c.setStrokeColor(path_color)
            
            if i < len(chain_data) - 1:
                next_x, next_y = positions[i+1]
                path = c.beginPath()
                path.moveTo(x, y)
                if next_y == y:
                    path.lineTo(next_x, next_y)
                else:
                    # Simple rectilinear drop down, curving at corners
                    turn_radius = 20
                    # if x == next_x (they are on top of each other, shouldn't happen with our snake pattern)
                    # we must go out around the node!
                    dist_out = node_radius + 20
                    
                    if x > next_x: # Was going left to right, now dropping to next row going right to left
                        path.lineTo(x + dist_out - turn_radius, y)
                        path.arcTo(x + dist_out - turn_radius*2, y - turn_radius*2, x + dist_out, y, 90, -90)
                        path.lineTo(x + dist_out, next_y + turn_radius)
                        path.arcTo(x + dist_out - turn_radius*2, next_y, x + dist_out, next_y + turn_radius*2, 0, -90)
                        path.lineTo(next_x, next_y)
                    else: # Was going right to left, now dropping to next row going left to right
                        path.lineTo(x - dist_out + turn_radius, y)
                        path.arcTo(x - dist_out, y - turn_radius*2, x - dist_out + turn_radius*2, y, 90, 90)
                        path.lineTo(x - dist_out, next_y + turn_radius)
                        path.arcTo(x - dist_out, next_y, x - dist_out + turn_radius*2, next_y + turn_radius*2, 180, 90)
                        path.lineTo(next_x, next_y)
                c.drawPath(path)

        # Draw End block
        if positions:
            last_x, last_y = positions[-1]
            last_device = chain_data[-1]
            last_output_proto = last_device.get('raw_data', {}).get('output_type', '-')
            
            c.setStrokeColor(get_protocol_color(last_output_proto))
            c.line(last_x, last_y, last_x + node_radius + 20, last_y)
            
            c.setFillColor(colors.HexColor('#00D9FF'))
            c.roundRect(last_x + node_radius + 20, last_y - 20, 20, 40, 5, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 10)
            c.saveState()
            c.translate(last_x + node_radius + 30, last_y)
            c.rotate(90)
            c.drawCentredString(0, -3, "END")
            c.restoreState()

        # Draw nodes over the lines
        c.setDash(1, 0) # Solid lines for nodes
        
        for i, device in enumerate(chain_data):
            x, y = positions[i]
            
            # Draw Split Background inside Circle
            c.saveState()
            
            # Create a circular clipping path
            circle_path = c.beginPath()
            circle_path.circle(x, y, node_radius)
            c.clipPath(circle_path, stroke=0, fill=0)
            
            # Background
            c.setFillColor(colors.HexColor('#4A4A4A'))
            c.rect(x - node_radius, y - node_radius, node_radius * 2, node_radius * 2, fill=1, stroke=0)
            
            # Left protocol color
            in_proto = device.get('raw_data', {}).get('input_type', '-')
            if in_proto and in_proto != '-':
                c.setFillColor(get_protocol_color(in_proto))
                # Draw left polygon: (0,0) to (70%,0) to (45%,100%) to (0,100%)
                w, h = node_radius * 2, node_radius * 2
                px, py = x - node_radius, y - node_radius
                left_path = c.beginPath()
                left_path.moveTo(px, py + h)
                left_path.lineTo(px + w * 0.7, py + h)
                left_path.lineTo(px + w * 0.45, py)
                left_path.lineTo(px, py)
                left_path.close()
                c.drawPath(left_path, stroke=0, fill=1)
                
            # Right protocol color
            out_proto = device.get('raw_data', {}).get('output_type', '-')
            if out_proto and out_proto != '-':
                c.setFillColor(get_protocol_color(out_proto))
                # Draw right polygon: (70%,0) to (100%,0) to (100%,100%) to (45%,100%)
                w, h = node_radius * 2, node_radius * 2
                px, py = x - node_radius, y - node_radius
                right_path = c.beginPath()
                right_path.moveTo(px + w * 0.7, py + h)
                right_path.lineTo(px + w, py + h)
                right_path.lineTo(px + w, py)
                right_path.lineTo(px + w * 0.45, py)
                right_path.close()
                c.drawPath(right_path, stroke=0, fill=1)
                
            c.restoreState()
            
            # Draw circle border
            c.setStrokeColor(colors.HexColor('#222222'))
            c.setLineWidth(1)
            c.circle(x, y, node_radius, fill=0, stroke=1)
            
            # Try to draw image inside
            filename = device.get('image')
            if filename:
                img_path = os.path.join(Config.IMAGE_FOLDER, filename)
                if os.path.exists(img_path):
                    try:
                        # reportlab handles transparent pngs pretty well directly if pillow is installed
                        img_size = node_radius * 1.5
                        c.drawImage(img_path, x - img_size/2, y - img_size/2, width=img_size, height=img_size, mask='auto', preserveAspectRatio=True)
                    except Exception as e:
                        logger.warning(f"Could not draw image for {device.get('name')}: {e}")
                    
            # Text below node
            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 9)
            
            # Truncate and split name
            name = device.get('name', 'Unknown')
            if len(name) > 20:
                words = name.split()
                line1 = " ".join(words[:len(words)//2])
                line2 = " ".join(words[len(words)//2:])
                c.drawCentredString(x, y - node_radius - 15, line1)
                c.drawCentredString(x, y - node_radius - 26, line2)
            else:
                c.drawCentredString(x, y - node_radius - 15, name)
                
            c.setFillColor(colors.HexColor('#00D9FF'))
            c.setFont("Helvetica", 8)
            lat = f"Lat: {device.get('latency', 0):.2f}ms"
            c.drawCentredString(x, y - node_radius - 36, lat)

        # Draw Footer with Total Latency
        c.setFillColor(colors.HexColor('#323d4d')) # Dark blue/gray requested by user
        c.rect(0, 0, width, 50, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 12)
        c.drawRightString(width - 20, 20, f"TOTAL LATENCY: {total_latency:.2f} ms")
        
        # Draw Logo in Footer
        try:
            logo_path = os.path.join("static", "images", "logo_buttom.svg")
            if os.path.exists(logo_path):
                logo = svg2rlg(logo_path)
                if logo:
                    # Scale down the logo proportionately if it's too big, typical height for footer ~30px
                    scale_factor = 30.0 / getattr(logo, 'height', 100)
                    logo.scale(scale_factor, scale_factor)
                    renderPDF.draw(logo, c, 20, 10)
        except Exception as e:
            logger.warning(f"Could not draw logo in PDF footer: {e}")
        
        # Save PDF
        c.save()
        buf.seek(0)
        return buf.getvalue()
    
    except Exception as e:
        logger.error(f"Error generating flowchart PDF: {e}")
        raise
