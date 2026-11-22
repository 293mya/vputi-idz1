from pathlib import Path

import qrcode
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import landscape, A5
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
TEMP_DIR = ROOT / "tmp" / "pdfs"
OUTPUT_PATH = OUTPUT_DIR / "demo-travel-ticket.pdf"
QR_PATH = TEMP_DIR / "demo-ticket-qr.png"

BLUE = HexColor("#0877F9")
BLUE_DARK = HexColor("#075FC7")
BLUE_SOFT = HexColor("#E3EFFF")
INK = HexColor("#0B1324")
MUTED = HexColor("#737B88")
LINE = HexColor("#DDE5EE")
YELLOW = HexColor("#FFE9A6")
PAPER = HexColor("#F5F7FA")


def register_fonts():
    font_dir = Path("/System/Library/Fonts/Supplemental")
    pdfmetrics.registerFont(TTFont("TicketRegular", str(font_dir / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("TicketBold", str(font_dir / "Arial Bold.ttf")))


def draw_label(c, x, y, label, value, width=108):
    c.setFillColor(MUTED)
    c.setFont("TicketRegular", 7.5)
    c.drawString(x, y, label.upper())
    c.setFillColor(INK)
    c.setFont("TicketBold", 11)
    c.drawString(x, y - 15, value)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(x, y - 23, x + width, y - 23)


def build_ticket():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    register_fonts()

    qr = qrcode.QRCode(version=3, box_size=8, border=1)
    qr.add_data("DEMO-TICKET|VPUTI|BCN-STN|2026-12-01|0620|2026-12-01|0845|UX2601")
    qr.make(fit=True)
    qr.make_image(fill_color="#0B1324", back_color="white").save(QR_PATH)

    page_width, page_height = landscape(A5)
    c = canvas.Canvas(str(OUTPUT_PATH), pagesize=(page_width, page_height))
    c.setTitle("Демонстрационный авиабилет")
    c.setAuthor("Учебное приложение Мои поездки")
    c.setSubject("Тестовый PDF для проверки загрузки и открытия билета")

    c.setFillColor(PAPER)
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)

    margin = 24
    card_x = margin
    card_y = margin
    card_w = page_width - margin * 2
    card_h = page_height - margin * 2
    c.setFillColor(white)
    c.roundRect(card_x, card_y, card_w, card_h, 20, fill=1, stroke=0)

    header_h = 82
    c.setFillColor(BLUE)
    c.roundRect(card_x, card_y + card_h - header_h, card_w, header_h, 20, fill=1, stroke=0)
    c.rect(card_x, card_y + card_h - header_h, card_w, 20, fill=1, stroke=0)

    c.setFillColor(white)
    c.setFont("TicketBold", 20)
    c.drawString(card_x + 24, card_y + card_h - 36, "впути")
    c.setFont("TicketRegular", 9)
    c.drawString(card_x + 24, card_y + card_h - 55, "ДЕМОНСТРАЦИОННЫЙ АВИАБИЛЕТ")

    badge_w = 160
    badge_h = 30
    badge_x = card_x + card_w - badge_w - 22
    badge_y = card_y + card_h - 53
    c.setFillColor(YELLOW)
    c.roundRect(badge_x, badge_y, badge_w, badge_h, 11, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("TicketBold", 9)
    c.drawCentredString(badge_x + badge_w / 2, badge_y + 10, "ДЕМО - НЕ ДЛЯ ПЕРЕВОЗКИ")

    content_top = card_y + card_h - header_h - 25
    left = card_x + 28

    c.setFillColor(MUTED)
    c.setFont("TicketRegular", 8)
    c.drawString(left, content_top, "МАРШРУТ")

    route_y = content_top - 39
    c.setFillColor(INK)
    c.setFont("TicketBold", 31)
    c.drawString(left, route_y, "BCN")
    c.setFillColor(BLUE)
    c.setFont("TicketBold", 20)
    c.drawString(left + 79, route_y + 4, "→")
    c.setFillColor(INK)
    c.setFont("TicketBold", 31)
    c.drawString(left + 116, route_y, "STN")

    c.setFillColor(MUTED)
    c.setFont("TicketRegular", 9)
    c.drawString(left, route_y - 18, "Барселона, Эль-Прат")
    c.drawString(left + 116, route_y - 18, "Лондон, Станстед")

    details_y = route_y - 58
    draw_label(c, left, details_y, "Дата вылета", "1 декабря 2026", width=154)
    draw_label(c, left + 184, details_y, "Вылет", "06:20", width=108)

    lower_y = details_y - 55
    draw_label(c, left, lower_y, "Дата прибытия", "1 декабря 2026", width=154)
    draw_label(c, left + 184, lower_y, "Прилёт", "08:45", width=108)

    qr_size = 88
    qr_x = card_x + card_w - qr_size - 29
    qr_y = card_y + 75
    c.drawImage(str(QR_PATH), qr_x, qr_y, width=qr_size, height=qr_size, mask="auto")
    c.setFillColor(MUTED)
    c.setFont("TicketRegular", 7)
    c.drawCentredString(qr_x + qr_size / 2, qr_y - 11, "КОД БРОНИ: UX2601-DEMO")

    c.setStrokeColor(LINE)
    c.setDash(3, 3)
    c.line(card_x + card_w - 137, card_y + 38, card_x + card_w - 137, card_y + card_h - header_h - 15)
    c.setDash()

    c.setFillColor(BLUE_DARK)
    c.roundRect(left, card_y + 31, 337, 30, 10, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("TicketBold", 9)
    c.drawCentredString(left + 168.5, card_y + 41, "ТЕСТОВЫЙ ФАЙЛ ДЛЯ ПРИЛОЖЕНИЯ «МОИ ПОЕЗДКИ»")

    c.setFillColor(MUTED)
    c.setFont("TicketRegular", 6.8)
    c.drawString(left, card_y + 15, "Все данные вымышлены. Билет не подтверждает бронирование и не даёт права на поездку.")

    c.showPage()
    c.save()
    return OUTPUT_PATH


if __name__ == "__main__":
    print(build_ticket())
