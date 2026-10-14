from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "design" / "连续会员续费中-付费页设计稿.png"
S = 2
W, H = 1320, 1060


def font(size, bold=False):
    name = "msyhbd.ttc" if bold else "msyh.ttc"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size * S)


im = Image.new("RGB", (W * S, H * S), "#f2f3f0")
d = ImageDraw.Draw(im)


def xy(box):
    return tuple(int(v * S) for v in box)


def rect(box, fill, radius=0, outline=None, width=1):
    d.rounded_rectangle(xy(box), radius * S, fill=fill, outline=outline, width=width * S)


def text(x, y, value, size, fill, bold=False, anchor=None):
    d.text((x * S, y * S), value, font=font(size, bold), fill=fill, anchor=anchor)


def line(points, fill, width=1):
    d.line([(x * S, y * S) for x, y in points], fill=fill, width=width * S)


def mark(x, y, yes):
    if yes:
        line([(x - 8, y), (x - 2, y + 6), (x + 9, y - 7)], "#bd8330", 2)
    else:
        line([(x - 6, y - 6), (x + 6, y + 6)], "#cfd3ce", 2)
        line([(x + 6, y - 6), (x - 6, y + 6)], "#cfd3ce", 2)


text(48, 34, "付费页 · 沿用终身 SVIP 已开通状态", 31, "#173f34", True)
text(49, 83, "仅调整卡片文案和按钮去向；卡片造型、皇冠、间距及权益对比沿用现状", 15, "#65736e")
rect((48, 123, 1268, 997), "#ffffff", 20)

banner = Image.open(ROOT / "assets" / "payment-banner.png").convert("RGB")
scale = max(390 / banner.width, 305 / banner.height)
banner = banner.resize((round(banner.width * scale * S), round(banner.height * scale * S)), Image.Resampling.LANCZOS)
cx = (banner.width - 390 * S) // 2
cy = int((banner.height - 305 * S) * .38)
banner = banner.crop((cx, cy, cx + 390 * S, cy + 305 * S))
crown = Image.open(ROOT / "assets" / "payment-lifetime-crown.png").convert("RGBA")
crown = crown.resize((88 * S, 88 * S), Image.Resampling.LANCZOS)


def phone(x, y, proposed):
    # Shadow, frame, and original payment banner.
    rect((x, y, x + 390, y + 844), "#f7f7f7", 32, "#d9dfda", 1)
    im.paste(banner, (int(x * S), int(y * S)))
    # Subtle darkening ensures familiar banner slogan remains readable.
    dark = Image.new("RGBA", (390 * S, 115 * S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(dark)
    for i in range(115 * S):
        a = round(110 * i / (115 * S))
        gd.line((0, i, 390 * S, i), fill=(0, 0, 0, a))
    im.paste(dark, (x * S, (y + 190) * S), dark)
    text(x + 22, y + 13, "10:00", 13, "#ffffff", True)
    text(x + 323, y + 12, "▮▮  ◢  ▰", 12, "#ffffff")
    rect((x + 17, y + 37, x + 49, y + 69), "#173124", 16)
    text(x + 27, y + 39, "‹", 27, "#ffffff")
    rect((x + 345, y + 37, x + 377, y + 69), "#173124", 16)
    text(x + 353, y + 42, "♧", 18, "#ffffff")
    text(x + 27, y + 245, "一键成片，让你的作品动起来", 16, "#ffffff", True)
    rect((x + 174, y + 283, x + 216, y + 286), "#b2aeab", 2)
    rect((x + 174, y + 283, x + 187, y + 286), "#ffffff", 2)
    rect((x, y + 305, x + 390, y + 347), "#374943")
    selected_x = x if proposed else x + 124
    rect((selected_x, y + 305, selected_x + (150 if proposed else 142), y + 349), "#f7f7f7", 16)
    text(x + 34, y + 319, "VIP会员", 16, "#171717" if proposed else "#bbcec5", proposed)
    text(x + 159, y + 319, "SVIP会员", 16, "#171717" if not proposed else "#bbcec5", not proposed)
    text(x + 302, y + 319, "AI充值", 16, "#bbcec5")

    # Reuse the existing lifetime-SVIP card's 338 x 227 geometry and gold CTA.
    rect((x + 26, y + 351, x + 364, y + 578), "#ffffff", 11, "#eeeeee")
    d.rounded_rectangle(xy((x + 159, y + 351, x + 231, y + 385)), radius=18 * S, fill="#f7f7f7")
    im.paste(crown, ((x + 151) * S, (y + 301) * S), crown)
    title = "你已开通 VIP 连续包月" if proposed else "你已经是 SVIP 终身会员"
    subtitle = "自动续费中 · 10月21日扣费 ¥18" if proposed else "可享受所有 SVIP 权益"
    cta = "管理自动续费" if proposed else "去加框"
    text(x + 195, y + 447, title, 18 if proposed else 19, "#333333", True, "mm")
    text(x + 195, y + 483, subtitle, 13 if proposed else 14, "#b6b6b6", True, "mm")
    rect((x + 55, y + 531, x + 335, y + 575), "#fff0df", 22, "#eab067")
    text(x + 195, y + 553, cta, 17, "#ad702e", True, "mm")

    text(x + 27, y + 617, "权益对比", 16, "#343d36", True)
    # The existing comparison remains below the card.
    cols = [x + 26, x + 148, x + 226, x + 296, x + 364]
    for j in range(4):
        rect((cols[j], y + 655, cols[j + 1], y + 696), "#fff2d5" if j == (2 if proposed else 3) else "#ffffff")
    rect((x + 26, y + 655, x + 364, y + 759), None, 6, "#e5e8e4")
    for yy in [696, 727]:
        line([(x + 26, y + yy), (x + 364, y + yy)], "#e5e8e4")
    for xx in cols[1:-1]:
        line([(xx, y + 655), (xx, y + 759)], "#e5e8e4")
    for cx2, label in [(x + 87, "权益"), (x + 187, "普通用户"), (x + 261, "VIP"), (x + 330, "SVIP")]:
        text(cx2, y + 676, label, 11, "#936221" if label == ("VIP" if proposed else "SVIP") else "#747a75", label == ("VIP" if proposed else "SVIP"), "mm")
    text(x + 87, y + 711, "VIP全部权益", 11, "#777e79", anchor="mm")
    mark(x + 187, y + 711, False)
    mark(x + 261, y + 711, True)
    mark(x + 330, y + 711, True)
    text(x + 87, y + 743, "SVIP画框", 11, "#777e79", anchor="mm")
    mark(x + 187, y + 743, False)
    mark(x + 261, y + 743, False)
    mark(x + 330, y + 743, True)


phone(79, 145, False)
phone(509, 145, True)
text(90, 1008, "现有  ·  终身 SVIP", 15, "#33483a", True)
text(520, 1008, "拟调整  ·  VIP 连续包月续费中", 15, "#33483a", True)

rect((934, 159, 1242, 954), "#f6f8f5", 16)
text(956, 184, "只改 3 处", 19, "#173f34", True)
line([(956, 223), (1220, 223)], "#d9e3da")
for yy, n, heading, rows in [
    (248, "01", "卡片主文案", ["“你已开通 VIP 连续包月”", "随实际等级与商品名替换。"]),
    (390, "02", "卡片副文案", ["显示下次扣费日期和金额；", "详细续费状态在管理页查看。"]),
    (532, "03", "卡片按钮", ["“去加框”改为“管理自动续费”；", "点击进入现有续费管理页。"]),
]:
    rect((956, yy, 990, yy + 30), "#dceee2", 9)
    text(973, yy + 15, n, 13, "#327b54", True, "mm")
    text(1002, yy + 2, heading, 15, "#263e30", True)
    for i, row in enumerate(rows):
        text(956, yy + 42 + i * 22, row, 12, "#6d7a70")
rect((956, 694, 1219, 914), "#eaf2ea", 12)
text(974, 715, "沿用现状", 14, "#236044", True)
text(974, 750, "皇冠与白色卡片", 12, "#495c4d")
text(974, 776, "金色描边按钮", 12, "#495c4d")
text(974, 802, "权益对比表", 12, "#495c4d")
text(974, 838, "不展示套餐、支付与购买协议", 12, "#495c4d")
text(974, 880, "示例日期与金额仅用于视觉展示", 10, "#7a897d")

OUT.parent.mkdir(parents=True, exist_ok=True)
im.save(OUT)
print(OUT)
