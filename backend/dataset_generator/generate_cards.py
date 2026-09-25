"""
AssureX Claim Engine — Claim Summary Card Generator (Phase 1 & Phase 4)

Renders professional, standardized Claim Summary Cards as high-resolution PNG images.

CRITICAL DESIGN RULE (SRS Deliverable 5 & Steps 7, 20):
The Claim Summary Card MUST NOT contain:
- Python model prediction
- Teachable Machine prediction
- Confidence scores
- Final decision (Likely Valid / Likely Invalid / Manual Review)

It contains ONLY objective factual data:
- Claim ID, Product Info, Serial Numbers
- Dates (Purchase, Warranty, Fault, Submission)
- Reported Incident & Damage Type
- Document Verification Status
- Objective Discrepancies (Serial mismatch, date contradictions, exclusion flags)
"""

import os
import sys
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
ROOT_DIR = os.path.dirname(BASE_DIR)
CARDS_DIR = os.path.join(ROOT_DIR, "sample_claims", "cards")

# Class folder name mapping for Teachable Machine directory layout
CLASS_FOLDER_MAP = {
    "Likely Valid": "likely_valid",
    "Likely Invalid": "likely_invalid",
    "Manual Review Required": "manual_review",
}

# Fonts loader helper
def get_font(size, bold=False):
    """Attempt to load clean Windows system fonts, falling back to default."""
    font_paths = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def render_claim_card(claim, variant=0, width=640, height=880):
    """
    Renders an individual claim summary card as a PIL Image.
    variant: 0 (Executive Navy) or 1 (Modern Technical Slate/Teal)
    """
    # Color palette
    if variant == 0:
        header_bg = (15, 23, 42)        # Deep Navy / Slate
        accent_color = (37, 99, 235)     # Royal Blue
        badge_bg = (219, 234, 254)      # Light Blue
        badge_fg = (30, 64, 175)
    else:
        header_bg = (19, 78, 74)        # Deep Teal
        accent_color = (13, 148, 136)    # Teal
        badge_bg = (204, 251, 241)      # Light Teal
        badge_fg = (17, 94, 89)

    card_bg = (255, 255, 255)
    card_border = (203, 213, 225)
    section_bg = (248, 250, 252)
    text_primary = (15, 23, 42)
    text_secondary = (71, 85, 105)
    text_muted = (148, 163, 184)
    line_divider = (226, 232, 240)

    # Status colors
    green_bg = (220, 252, 231)
    green_fg = (22, 101, 52)
    red_bg = (254, 226, 226)
    red_fg = (153, 27, 27)
    amber_bg = (254, 243, 199)
    amber_fg = (146, 64, 14)

    # Create image
    img = Image.new("RGB", (width, height), card_bg)
    draw = ImageDraw.Draw(img)

    # Fonts
    font_title = get_font(18, bold=True)
    font_sub = get_font(12, bold=False)
    font_h2 = get_font(13, bold=True)
    font_body = get_font(12, bold=False)
    font_body_bold = get_font(12, bold=True)
    font_small = get_font(10, bold=False)
    font_small_bold = get_font(10, bold=True)

    # Outer border
    draw.rectangle([(8, 8), (width - 9, height - 9)], outline=card_border, width=2)

    # Header Banner
    draw.rectangle([(10, 10), (width - 10, 80)], fill=header_bg)
    draw.text((25, 20), "ASSUREX CLAIM SUMMARY DOSSIER", fill=(255, 255, 255), font=font_title)
    draw.text((25, 48), "OBJECTIVE VERIFICATION & FACT SHEET — NO PREDICTIONS", fill=(148, 163, 184), font=font_sub)

    # Top right Claim ID tag
    claim_id = str(claim.get("claim_id", "CLM-00000"))
    draw.rounded_rectangle([(width - 150, 24), (width - 25, 60)], radius=4, fill=(255, 255, 255))
    draw.text((width - 140, 32), claim_id, fill=header_bg, font=font_body_bold)

    y = 95

    # Helper: Section Header
    def draw_section_hdr(title, cur_y):
        draw.rectangle([(20, cur_y), (width - 20, cur_y + 26)], fill=section_bg)
        draw.rectangle([(20, cur_y), (25, cur_y + 26)], fill=accent_color)
        draw.text((34, cur_y + 5), title, fill=text_primary, font=font_h2)
        return cur_y + 34

    # 1. Product & Customer Information
    y = draw_section_hdr("1. PRODUCT & PURCHASE IDENTIFICATION", y)
    
    col1_x = 30
    col2_x = 330

    product_name = str(claim.get("product_name", "N/A"))
    category = str(claim.get("product_category", "N/A"))
    brand = str(claim.get("brand", "N/A"))
    model = str(claim.get("model_number", "N/A"))
    sn_entered = str(claim.get("serial_number_entered", "N/A"))
    purchase_date = str(claim.get("purchase_date", "N/A"))
    price = f"${float(claim.get('purchase_price', 0.0)):,.2f}"
    retailer = str(claim.get("retailer", "N/A"))

    draw.text((col1_x, y), "Product:", fill=text_secondary, font=font_body)
    draw.text((col1_x + 95, y), f"{brand} {product_name}", fill=text_primary, font=font_body_bold)

    draw.text((col2_x, y), "Category:", fill=text_secondary, font=font_body)
    draw.text((col2_x + 85, y), category, fill=text_primary, font=font_body_bold)

    y += 20
    draw.text((col1_x, y), "Model #:", fill=text_secondary, font=font_body)
    draw.text((col1_x + 95, y), model, fill=text_primary, font=font_body)

    draw.text((col2_x, y), "Serial Entered:", fill=text_secondary, font=font_body)
    draw.text((col2_x + 85, y), sn_entered, fill=text_primary, font=font_body_bold)

    y += 20
    draw.text((col1_x, y), "Purchase Date:", fill=text_secondary, font=font_body)
    draw.text((col1_x + 95, y), purchase_date, fill=text_primary, font=font_body)

    draw.text((col2_x, y), "Retailer:", fill=text_secondary, font=font_body)
    draw.text((col2_x + 85, y), f"{retailer} ({price})", fill=text_primary, font=font_body)

    y += 32

    # 2. Warranty Terms & Status
    y = draw_section_hdr("2. WARRANTY TERMS & COVERAGE PERIOD", y)

    w_start = str(claim.get("warranty_start", "N/A"))
    w_end = str(claim.get("warranty_end", "N/A"))
    w_type = str(claim.get("warranty_type", "Standard"))
    provider = str(claim.get("warranty_provider", "Manufacturer"))
    remaining_days = int(claim.get("remaining_warranty_days", 0))

    draw.text((col1_x, y), "Coverage:", fill=text_secondary, font=font_body)
    draw.text((col1_x + 95, y), f"{w_type} ({provider})", fill=text_primary, font=font_body)

    draw.text((col2_x, y), "Period:", fill=text_secondary, font=font_body)
    draw.text((col2_x + 85, y), f"{w_start}  to  {w_end}", fill=text_primary, font=font_body)

    y += 22
    draw.text((col1_x, y), "Status:", fill=text_secondary, font=font_body)
    if remaining_days > 7:
        status_text = f"ACTIVE ({remaining_days} days remaining)"
        s_bg, s_fg = green_bg, green_fg
    elif 0 <= remaining_days <= 7:
        status_text = f"GRACE PERIOD ({remaining_days} days remaining)"
        s_bg, s_fg = amber_bg, amber_fg
    else:
        status_text = f"EXPIRED ({-remaining_days} days past expiry)"
        s_bg, s_fg = red_bg, red_fg

    draw.rounded_rectangle([(col1_x + 95, y - 2), (col1_x + 360, y + 18)], radius=3, fill=s_bg)
    draw.text((col1_x + 105, y + 1), status_text, fill=s_fg, font=font_small_bold)

    y += 34

    # 3. Incident & Reported Fault
    y = draw_section_hdr("3. INCIDENT CLASSIFICATION & DAMAGE", y)

    fault_date = str(claim.get("fault_date", "N/A"))
    sub_date = str(claim.get("claim_submission_date", "N/A"))
    fault_type = str(claim.get("fault_type", "N/A"))
    damage_type = str(claim.get("damage_type", "N/A"))
    fault_desc = str(claim.get("fault_description", "No description provided."))

    draw.text((col1_x, y), "Fault Date:", fill=text_secondary, font=font_body)
    draw.text((col1_x + 95, y), fault_date, fill=text_primary, font=font_body_bold)

    draw.text((col2_x, y), "Submission Date:", fill=text_secondary, font=font_body)
    draw.text((col2_x + 110, y), sub_date, fill=text_primary, font=font_body)

    y += 20
    draw.text((col1_x, y), "Incident Type:", fill=text_secondary, font=font_body)
    draw.text((col1_x + 95, y), fault_type, fill=text_primary, font=font_body)

    draw.text((col2_x, y), "Damage Type:", fill=text_secondary, font=font_body)
    draw.text((col2_x + 110, y), damage_type, fill=text_primary, font=font_body_bold)

    y += 24
    # Narrative Box
    draw.rectangle([(col1_x, y), (width - 30, y + 44)], fill=(241, 245, 249), outline=line_divider)
    draw.text((col1_x + 10, y + 6), "Reported Incident Narrative:", fill=text_muted, font=font_small_bold)
    # Truncate narrative if too long
    if len(fault_desc) > 75:
        fault_desc = fault_desc[:72] + "..."
    draw.text((col1_x + 10, y + 22), f'"{fault_desc}"', fill=text_primary, font=font_body)

    y += 54

    # 4. Service History & Document Verification
    y = draw_section_hdr("4. REPAIR HISTORY & DOCUMENTATION AUDIT", y)

    repairs = int(claim.get("repair_history_count", 0))
    auth_repair = bool(claim.get("previous_repair_authorized", True))

    rep_text = f"{repairs} prior service repair(s)"
    if repairs > 0:
        auth_tag = "Authorized Center" if auth_repair else "UNAUTHORIZED Modification/Shop"
        rep_text += f" — {auth_tag}"

    draw.text((col1_x, y), "Service History:", fill=text_secondary, font=font_body)
    draw.text((col1_x + 110, y), rep_text, fill=text_primary, font=font_body_bold)

    y += 24
    draw.text((col1_x, y), "Submitted Documents Verification Checklist:", fill=text_secondary, font=font_body)
    y += 20

    # 4 doc badges
    docs = [
        ("Purchase Receipt", bool(claim.get("receipt_uploaded", True))),
        ("Warranty Certificate", bool(claim.get("warranty_card_uploaded", True))),
        ("Fault Photo/Video", bool(claim.get("fault_evidence_uploaded", True))),
        ("Product Overview", bool(claim.get("product_image_uploaded", True))),
    ]

    bx = col1_x
    for doc_name, present in docs:
        bg = green_bg if present else red_bg
        fg = green_fg if present else red_fg
        icon = "[YES]" if present else "[NO]"
        badge_text = f"{icon} {doc_name}"
        draw.rounded_rectangle([(bx, y), (bx + 130, y + 22)], radius=3, fill=bg)
        draw.text((bx + 8, y + 4), badge_text, fill=fg, font=font_small_bold)
        bx += 140

    y += 34

    # 5. Objective Discrepancy & Consistency Checks
    y = draw_section_hdr("5. SYSTEM DISCREPANCY & AUDIT FLAGS", y)

    sn_mismatch = bool(claim.get("serial_mismatch_flag", False))
    date_contradiction = bool(claim.get("date_contradiction_flag", False))
    excluded = bool(claim.get("excluded_damage", False))
    duplicate = bool(claim.get("duplicate_claim_flag", False))

    flags = [
        ("Serial Cross-Match", "MISMATCH DETECTED" if sn_mismatch else "MATCH CONFIRMED", not sn_mismatch),
        ("Date Chronology", "CONTRADICTION DETECTED" if date_contradiction else "CHRONOLOGICAL VALID", not date_contradiction),
        ("Policy Exclusion", "EXCLUSION MATCHED" if excluded else "NO EXCLUSIONS", not excluded),
        ("Submission Dedup", "DUPLICATE MATCH" if duplicate else "UNIQUE RECORD", not duplicate),
    ]

    for label, val, is_ok in flags:
        bg = green_bg if is_ok else red_bg
        fg = green_fg if is_ok else red_fg
        draw.text((col1_x, y), f"• {label}:", fill=text_secondary, font=font_body)
        draw.rounded_rectangle([(col1_x + 160, y - 2), (col1_x + 360, y + 16)], radius=3, fill=bg)
        draw.text((col1_x + 170, y + 1), val, fill=fg, font=font_small_bold)
        y += 22

    # Bottom Footer & Security Hash / Watermark Simulation
    y = height - 50
    draw.line([(20, y), (width - 20, y)], fill=line_divider, width=1)
    draw.text((25, y + 10), "AssureX Claim Intelligence — Machine Learning Ready Claim Card Format", fill=text_muted, font=font_small)
    draw.text((25, y + 24), "CONFIDENTIAL DOCUMENT RECORD — FOR VERIFICATION AND TM CLASSIFICATION ONLY", fill=text_muted, font=font_small)

    # Barcode visual block
    for i in range(25):
        bx = width - 140 + (i * 4)
        bw = 2 if i % 3 != 0 else 1
        draw.line([(bx, y + 8), (bx, y + 32)], fill=(100, 116, 139), width=bw)

    return img


def generate_single_card_task(args):
    """Worker task for multiprocessing."""
    row_dict, split, variant, save_dir = args
    claim_id = row_dict["claim_id"]
    cls_name = row_dict["class_label"]
    folder_cls = CLASS_FOLDER_MAP.get(cls_name, "manual_review")

    target_dir = os.path.join(save_dir, split, folder_cls)
    os.makedirs(target_dir, exist_ok=True)

    filename = f"{claim_id}_var{variant}.png"
    filepath = os.path.join(target_dir, filename)

    img = render_claim_card(row_dict, variant=variant)
    img.save(filepath, "PNG", optimize=False)

    rel_path = os.path.relpath(filepath, ROOT_DIR).replace("\\", "/")
    return {
        "claim_id": claim_id,
        "split": split,
        "variant": variant,
        "image_path": rel_path,
        "class_label": cls_name,
    }


def batch_generate_cards(max_workers=None):
    """
    Batch generate card images:
    - Train: 1,750 records x 2 variants = 3,500 images
    - Val: 375 records x 1 variant = 375 images
    - Test: 375 records x 1 variant = 375 images
    Total = 4,250 images
    """
    train_path = os.path.join(DATA_DIR, "claims_train.csv")
    val_path = os.path.join(DATA_DIR, "claims_val.csv")
    test_path = os.path.join(DATA_DIR, "claims_test.csv")

    if not all(os.path.exists(p) for p in [train_path, val_path, test_path]):
        raise FileNotFoundError("Split CSVs not found! Run generate_claims.py first.")

    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)
    test_df = pd.read_csv(test_path)

    tasks = []
    # Train: 2 variants per record (Variant 0 and Variant 1)
    for _, row in train_df.iterrows():
        tasks.append((row.to_dict(), "train", 0, CARDS_DIR))
        tasks.append((row.to_dict(), "train", 1, CARDS_DIR))

    # Val: 1 variant (Variant 0)
    for _, row in val_df.iterrows():
        tasks.append((row.to_dict(), "val", 0, CARDS_DIR))

    # Test: 1 variant (Variant 0)
    for _, row in test_df.iterrows():
        tasks.append((row.to_dict(), "test", 0, CARDS_DIR))

    total_tasks = len(tasks)
    print(f"Generating {total_tasks} Claim Summary Cards across train/val/test splits...")

    if max_workers is None:
        max_workers = min(multiprocessing.cpu_count(), 8)

    mapping_records = []
    completed = 0

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(generate_single_card_task, t) for t in tasks]
        for f in as_completed(futures):
            res = f.result()
            mapping_records.append(res)
            completed += 1
            if completed % 500 == 0 or completed == total_tasks:
                print(f"Rendered {completed}/{total_tasks} cards ({completed/total_tasks*100:.1f}%)...")

    mapping_df = pd.DataFrame(mapping_records)
    mapping_path = os.path.join(DATA_DIR, "card_image_mapping.csv")
    mapping_df.to_csv(mapping_path, index=False)
    print(f"\nSaved image mapping to {mapping_path} ({len(mapping_df)} records)")

    print("\nCards Breakdown by Split & Class:")
    print(mapping_df.groupby(["split", "class_label"]).size())


if __name__ == "__main__":
    batch_generate_cards()
