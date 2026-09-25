"""
AssureX Claim Engine — Synthetic Claim Dataset Generator (Phase 1)

Generates 2,500 realistic warranty claim records with realistic messiness,
anomalies, date contradictions, serial number mismatches, and rule violations.

Ground Truth Classes:
- "Likely Valid" (~48%)
- "Likely Invalid" (~32%)
- "Manual Review Required" (~20%)

Splits: Stratified 70/15/15:
- Training: 1,750 records
- Validation: 375 records
- Test: 375 records
"""

import json
import os
import random
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# Set fixed seed for exact reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
POLICIES_DIR = os.path.join(BASE_DIR, "policies")

os.makedirs(DATA_DIR, exist_ok=True)

# Product catalog for realistic generation
PRODUCT_CATALOG = {
    "Electronics": {
        "brands": ["Sony", "Samsung", "Apple", "Dell", "LG", "HP", "Lenovo", "Asus"],
        "items": [
            ("OLED 4K Smart TV", 1200.0, 24),
            ("Galaxy Ultra Smartphone", 999.0, 24),
            ("ProBook Laptop 15-inch", 850.0, 24),
            ("Active Noise Cancelling Headphones", 280.0, 24),
            ("Mirrorless Camera Body", 1450.0, 24),
            ("Tablet 11-inch Display", 650.0, 24),
            ("Gaming Desktop Rig", 1850.0, 24),
            ("Smart Watch Series 7", 399.0, 24),
        ],
        "covered_faults": [
            "Manufacturing Defect",
            "Electrical Failure",
            "Software Malfunction",
            "Component Failure",
            "Display Defect",
        ],
        "excluded_damages": [
            "Accidental Damage",
            "Water Damage",
            "Physical Impact",
            "Cosmetic Damage",
            "Unauthorized Modification",
            "Jailbreaking or Rooting",
        ],
        "retailers": ["BestBuy", "Amazon Electronics", "B&H Photo", "Target", "Direct Manufacturer Store"],
    },
    "Appliances": {
        "brands": ["Whirlpool", "Bosch", "LG", "Samsung", "GE Appliances", "KitchenAid", "Maytag"],
        "items": [
            ("French Door Refrigerator", 1600.0, 36),
            ("Front-Load Washing Machine", 850.0, 36),
            ("Smart Dishwasher 24-inch", 750.0, 36),
            ("Convection Microwave Oven", 320.0, 36),
            ("Electric Range Oven", 1100.0, 36),
            ("Heavy-Duty Clothes Dryer", 800.0, 36),
        ],
        "covered_faults": [
            "Manufacturing Defect",
            "Motor Failure",
            "Compressor Failure",
            "Thermostat Malfunction",
            "Electrical Wiring Defect",
            "Control Board Failure",
        ],
        "excluded_damages": [
            "Accidental Damage",
            "Power Surge Damage",
            "Pest Infestation Damage",
            "Cosmetic Wear",
            "Unauthorized Modification",
            "Commercial Use of Domestic Product",
            "Damage from Improper Installation",
        ],
        "retailers": ["Home Depot", "Lowe's", "Sears Appliance Outlet", "Costco", "Direct Factory Outlet"],
    },
    "Automotive": {
        "brands": ["Bosch Auto", "Denso", "Brembo", "ACDelco", "Monroe", "Continental Auto", "K&N"],
        "items": [
            ("Ceramic Brake Pad Set", 120.0, 12),
            ("High Output Alternator", 340.0, 12),
            ("Heavy-Duty Starter Motor", 260.0, 12),
            ("Electronic Fuel Injector Kit", 420.0, 12),
            ("Performance Shock Absorbers", 380.0, 12),
            ("ABS Wheel Speed Sensor", 95.0, 12),
        ],
        "covered_faults": [
            "Manufacturing Defect",
            "Premature Wear",
            "Material Failure",
            "Electrical Component Failure",
            "Seal or Gasket Failure",
        ],
        "excluded_damages": [
            "Accidental Damage",
            "Racing or Off-Road Use",
            "Improper Installation",
            "Neglected Maintenance",
            "Cosmetic Wear",
            "Damage from Incompatible Parts",
            "Environmental Corrosion",
        ],
        "retailers": ["AutoZone", "Advance Auto Parts", "O'Reilly Auto", "NAPA Auto Parts", "RockAuto"],
    },
}

FAULT_DESCRIPTIONS = {
    "Manufacturing Defect": [
        "Device shut down unexpectedly and fails to power back on under normal conditions.",
        "Internal solder joint loosened causing intermittent power disconnects.",
        "Factory assembly defect leading to unprovoked system failure.",
    ],
    "Electrical Failure": [
        "Internal circuit shorted during regular use with standard power supply.",
        "No current flowing to main motor despite active input power.",
        "Capacitor blown on the primary controller board without power surge.",
    ],
    "Software Malfunction": [
        "System firmware entered boot loop following manufacturer OTA update.",
        "Main OS freezes on start screen; hardware diagnostic passes.",
    ],
    "Component Failure": [
        "Sensor module stopped transmitting readings to the main board.",
        "Cooling fan bearing seized up leading to emergency thermal shutdown.",
    ],
    "Display Defect": [
        "Vertical colored line artifacts appeared across OLED panel without impact.",
        "Backlight flickering continuously on left half of screen.",
    ],
    "Motor Failure": [
        "Drive motor hums loudly but will not spin drum under normal load.",
        "Motor winding resistance out of spec, causing tripping.",
    ],
    "Compressor Failure": [
        "Compressor clicking repeatedly and unable to compress refrigerant.",
        "Cooling cycle fails to start, compressor is non-responsive.",
    ],
    "Thermostat Malfunction": [
        "Temperature reading fluctuating wildly causing erratic operation.",
        "Thermostat stuck open, temperature never reaches target threshold.",
    ],
    "Premature Wear": [
        "Brake pad friction compound deteriorated within 2,000 miles of highway driving.",
        "Bushing cracked prematurely during regular non-commercial transit.",
    ],
    "Accidental Damage": [
        "Dropped on concrete driveway resulting in shattered enclosure and severed cable.",
        "Heavy object fell directly on top of the chassis during home move.",
    ],
    "Water Damage": [
        "Submerged in water during heavy basement storm leak.",
        "Liquid spilled directly into top vents while device was operating.",
    ],
    "Commercial Use of Domestic Product": [
        "Machine installed in commercial 24-hour laundromat facility.",
        "Used continuously in catering business beyond residential duty cycle.",
    ],
    "Racing or Off-Road Use": [
        "Parts subjected to high-temperature track day racing conditions.",
        "Vehicle modified for off-road rock crawling causing extreme impact stress.",
    ],
    "Cosmetic Damage": [
        "Surface scratches and paint chip on front door bezel.",
        "Slight dent on exterior casing from transit handling.",
    ],
}


def random_date(start_date, end_date):
    """Generate a random date between start_date and end_date."""
    delta = end_date - start_date
    int_delta = int(delta.total_seconds())
    if int_delta <= 0:
        return start_date
    random_seconds = random.randint(0, int_delta)
    return start_date + timedelta(seconds=random_seconds)


def generate_single_claim(claim_idx, category, target_class=None):
    """
    Generate a single claim with consistent or deliberately inconsistent business rules.
    If target_class is specified, generates attributes naturally leading to that class.
    """
    claim_id = f"CLM-{claim_idx:05d}"
    product_info = PRODUCT_CATALOG[category]
    brand = random.choice(product_info["brands"])
    item_name, base_price, warranty_months = random.choice(product_info["items"])
    model_number = f"{brand[:3].upper()}-{category[:3].upper()}-{random.randint(100, 999)}"
    
    # Serial numbers (generate realistic alpha-numeric format)
    base_sn = f"SN{brand[:2].upper()}{random.randint(100000, 999999)}"
    serial_entered = base_sn
    serial_receipt = base_sn
    serial_warranty_card = base_sn

    price_variance = random.uniform(0.85, 1.25)
    purchase_price = round(base_price * price_variance, 2)
    retailer = random.choice(product_info["retailers"])
    product_id = f"PRD-{random.randint(10000, 99999)}"

    # Base dates: Purchase between 2023-01-01 and 2025-06-01
    purchase_date = random_date(datetime(2023, 1, 1), datetime(2025, 6, 1)).date()
    warranty_start = purchase_date
    warranty_type = random.choice(["Standard", "Standard", "Standard", "Extended"])
    if warranty_type == "Extended":
        warranty_months += 12
    warranty_end = purchase_date + timedelta(days=int(warranty_months * 30.4375))
    warranty_provider = f"{brand} Care Protection" if warranty_type == "Standard" else "AssureX Extended Guard"

    # Decide intended class if not given
    if target_class is None:
        target_class = random.choices(
            ["Likely Valid", "Likely Invalid", "Manual Review Required"],
            weights=[0.48, 0.32, 0.20],
            k=1
        )[0]

    # Initialize realistic scenario flags
    serial_mismatch_flag = False
    date_contradiction_flag = False
    excluded_damage = False
    warranty_expired = False
    borderline_warranty = False
    previous_repair_authorized = True
    duplicate_claim_flag = False
    
    # Document upload status
    receipt_uploaded = True
    warranty_card_uploaded = True
    product_image_uploaded = True
    fault_evidence_uploaded = True
    repair_report_uploaded = False

    repair_history_count = 0

    if target_class == "Likely Valid":
        # Safe within active warranty (e.g., 20% to 75% into warranty period)
        total_warranty_days = (warranty_end - warranty_start).days
        fault_offset_days = random.randint(int(total_warranty_days * 0.15), int(total_warranty_days * 0.75))
        fault_date = warranty_start + timedelta(days=fault_offset_days)
        claim_submission_date = fault_date + timedelta(days=random.randint(1, 15))

        fault_type = random.choice(product_info["covered_faults"])
        damage_type = "Electrical" if "Electrical" in fault_type else "Manufacturing"
        
        # High document completion
        receipt_uploaded = True
        warranty_card_uploaded = random.random() > 0.10
        product_image_uploaded = True
        fault_evidence_uploaded = True
        
        # Low or zero repair count
        repair_history_count = random.choice([0, 0, 0, 1])
        if repair_history_count > 0:
            previous_repair_authorized = True
            repair_report_uploaded = True

    elif target_class == "Likely Invalid":
        # Introduce at least one decisive hard fail rule
        failure_mode = random.choice([
            "expired_warranty",
            "excluded_damage",
            "no_receipt",
            "unauthorized_repair_excessive",
        ])

        if failure_mode == "expired_warranty":
            # Fault occurred 20 to 180 days AFTER warranty expired
            days_after_expiry = random.randint(20, 180)
            fault_date = warranty_end + timedelta(days=days_after_expiry)
            claim_submission_date = fault_date + timedelta(days=random.randint(2, 20))
            fault_type = random.choice(product_info["covered_faults"])
            damage_type = "Manufacturing"
            warranty_expired = True

        elif failure_mode == "excluded_damage":
            total_warranty_days = (warranty_end - warranty_start).days
            fault_date = warranty_start + timedelta(days=random.randint(30, max(31, total_warranty_days - 30)))
            claim_submission_date = fault_date + timedelta(days=random.randint(1, 14))
            damage_type = random.choice(product_info["excluded_damages"])
            fault_type = damage_type
            excluded_damage = True

        elif failure_mode == "no_receipt":
            total_warranty_days = (warranty_end - warranty_start).days
            fault_date = warranty_start + timedelta(days=random.randint(30, max(31, total_warranty_days - 30)))
            claim_submission_date = fault_date + timedelta(days=random.randint(1, 14))
            fault_type = random.choice(product_info["covered_faults"])
            damage_type = "Manufacturing"
            receipt_uploaded = False  # Hard fail

        else:  # unauthorized repair with damage
            total_warranty_days = (warranty_end - warranty_start).days
            fault_date = warranty_start + timedelta(days=random.randint(30, max(31, total_warranty_days - 30)))
            claim_submission_date = fault_date + timedelta(days=random.randint(1, 14))
            fault_type = random.choice(product_info["covered_faults"])
            damage_type = "Unauthorized Modification"
            repair_history_count = random.randint(2, 4)
            previous_repair_authorized = False
            excluded_damage = True

    else:  # Manual Review Required
        # Ambiguous, borderline, or warning combinations
        review_mode = random.choice([
            "borderline_grace_period",
            "serial_mismatch",
            "date_contradiction",
            "unauthorized_repair_single",
            "high_repair_count_warning",
            "missing_evidence",
        ])

        if review_mode == "borderline_grace_period":
            # Fault occurred 1 to 7 days after expiry (within grace period!)
            fault_date = warranty_end + timedelta(days=random.randint(1, 7))
            claim_submission_date = fault_date + timedelta(days=random.randint(1, 5))
            fault_type = random.choice(product_info["covered_faults"])
            damage_type = "Manufacturing"
            borderline_warranty = True

        elif review_mode == "serial_mismatch":
            total_warranty_days = (warranty_end - warranty_start).days
            fault_date = warranty_start + timedelta(days=random.randint(30, max(31, total_warranty_days - 30)))
            claim_submission_date = fault_date + timedelta(days=random.randint(1, 10))
            fault_type = random.choice(product_info["covered_faults"])
            damage_type = "Manufacturing"
            # Receipt has typo in serial number (e.g., last digit swapped)
            serial_receipt = base_sn[:-2] + str(random.randint(10, 99))
            serial_mismatch_flag = True

        elif review_mode == "date_contradiction":
            # Fault date mistakenly set before purchase date or claim date before fault date
            fault_date = purchase_date - timedelta(days=random.randint(3, 45))
            claim_submission_date = purchase_date + timedelta(days=random.randint(5, 20))
            fault_type = random.choice(product_info["covered_faults"])
            damage_type = "Manufacturing"
            date_contradiction_flag = True

        elif review_mode == "unauthorized_repair_single":
            total_warranty_days = (warranty_end - warranty_start).days
            fault_date = warranty_start + timedelta(days=random.randint(30, max(31, total_warranty_days - 30)))
            claim_submission_date = fault_date + timedelta(days=random.randint(1, 10))
            fault_type = random.choice(product_info["covered_faults"])
            damage_type = "Component Failure"
            repair_history_count = 1
            previous_repair_authorized = False  # Triggers manual review rule MR-003

        elif review_mode == "high_repair_count_warning":
            total_warranty_days = (warranty_end - warranty_start).days
            fault_date = warranty_start + timedelta(days=random.randint(30, max(31, total_warranty_days - 30)))
            claim_submission_date = fault_date + timedelta(days=random.randint(1, 10))
            fault_type = random.choice(product_info["covered_faults"])
            damage_type = "Manufacturing"
            repair_history_count = 3  # Near max limit
            previous_repair_authorized = True
            repair_report_uploaded = True

        else:  # missing_evidence
            total_warranty_days = (warranty_end - warranty_start).days
            fault_date = warranty_start + timedelta(days=random.randint(30, max(31, total_warranty_days - 30)))
            claim_submission_date = fault_date + timedelta(days=random.randint(1, 10))
            fault_type = random.choice(product_info["covered_faults"])
            damage_type = "Electrical Failure"
            fault_evidence_uploaded = False  # Mandatory doc missing, but receipt is present

    # Pick fault description
    desc_list = FAULT_DESCRIPTIONS.get(fault_type, FAULT_DESCRIPTIONS.get(damage_type, [
        "Unspecified system degradation observed during normal operating routine."
    ]))
    fault_description = random.choice(desc_list)

    # Derived metrics
    product_age_months = max(0, int((fault_date - purchase_date).days / 30.4375))
    remaining_warranty_days = (warranty_end - fault_date).days

    # Missing docs count
    all_possible_docs = [
        receipt_uploaded,
        warranty_card_uploaded,
        product_image_uploaded,
        fault_evidence_uploaded,
        repair_report_uploaded if repair_history_count > 0 else True,
    ]
    missing_doc_count = sum(1 for d in all_possible_docs if not d)

    # In rare test cases (~2.5%), tag duplicate
    if random.random() < 0.025 and target_class != "Likely Valid":
        duplicate_claim_flag = True

    record = {
        "claim_id": claim_id,
        "product_id": product_id,
        "product_name": item_name,
        "product_category": category,
        "brand": brand,
        "model_number": model_number,
        "serial_number_entered": serial_entered,
        "serial_number_on_receipt": serial_receipt,
        "serial_number_on_warranty_card": serial_warranty_card,
        "purchase_date": purchase_date.strftime("%Y-%m-%d"),
        "purchase_price": purchase_price,
        "retailer": retailer,
        "warranty_start": warranty_start.strftime("%Y-%m-%d"),
        "warranty_end": warranty_end.strftime("%Y-%m-%d"),
        "warranty_provider": warranty_provider,
        "warranty_type": warranty_type,
        "fault_date": fault_date.strftime("%Y-%m-%d"),
        "claim_submission_date": claim_submission_date.strftime("%Y-%m-%d"),
        "fault_type": fault_type,
        "fault_description": fault_description,
        "damage_type": damage_type,
        "product_age_months": int(product_age_months),
        "remaining_warranty_days": int(remaining_warranty_days),
        "repair_history_count": int(repair_history_count),
        "previous_repair_authorized": bool(previous_repair_authorized),
        "receipt_uploaded": bool(receipt_uploaded),
        "warranty_card_uploaded": bool(warranty_card_uploaded),
        "product_image_uploaded": bool(product_image_uploaded),
        "fault_evidence_uploaded": bool(fault_evidence_uploaded),
        "repair_report_uploaded": bool(repair_report_uploaded),
        "missing_doc_count": int(missing_doc_count),
        "serial_mismatch_flag": bool(serial_mismatch_flag),
        "date_contradiction_flag": bool(date_contradiction_flag),
        "excluded_damage": bool(excluded_damage),
        "duplicate_claim_flag": bool(duplicate_claim_flag),
        "class_label": target_class,
    }
    return record


def generate_dataset(num_records=2500):
    """
    Generate balanced, category-stratified synthetic claims dataset.
    Categories: Electronics (45%), Appliances (35%), Automotive (20%)
    """
    print(f"Generating {num_records} synthetic claims...")
    
    categories = random.choices(
        ["Electronics", "Appliances", "Automotive"],
        weights=[0.45, 0.35, 0.20],
        k=num_records
    )

    # Maintain controlled target class proportions
    classes = random.choices(
        ["Likely Valid", "Likely Invalid", "Manual Review Required"],
        weights=[0.48, 0.32, 0.20],
        k=num_records
    )

    records = []
    for idx in range(1, num_records + 1):
        cat = categories[idx - 1]
        target_cls = classes[idx - 1]
        rec = generate_single_claim(idx, cat, target_cls)
        records.append(rec)

    df = pd.DataFrame(records)

    # Verify distribution
    print("\nDataset Class Distribution:")
    print(df["class_label"].value_counts(normalize=True).round(3) * 100)
    print("\nDataset Category Distribution:")
    print(df["product_category"].value_counts(normalize=True).round(3) * 100)

    # Perform stratified split (70% train, 15% val, 15% test)
    # Using sklearn train_test_split with stratify on class_label
    from sklearn.model_selection import train_test_split

    train_df, temp_df = train_test_split(
        df,
        test_size=0.30,
        random_state=RANDOM_SEED,
        stratify=df[["class_label", "product_category"]]
    )

    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.50,
        random_state=RANDOM_SEED,
        stratify=temp_df[["class_label", "product_category"]]
    )

    # Save to CSV files
    full_path = os.path.join(DATA_DIR, "claims_full.csv")
    train_path = os.path.join(DATA_DIR, "claims_train.csv")
    val_path = os.path.join(DATA_DIR, "claims_val.csv")
    test_path = os.path.join(DATA_DIR, "claims_test.csv")

    df.to_csv(full_path, index=False)
    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"\nSaved Full Dataset: {full_path} ({len(df)} rows)")
    print(f"Saved Train Split: {train_path} ({len(train_df)} rows, {len(train_df)/len(df)*100:.1f}%)")
    print(f"Saved Val Split: {val_path} ({len(val_df)} rows, {len(val_df)/len(df)*100:.1f}%)")
    print(f"Saved Test Split: {test_path} ({len(test_df)} rows, {len(test_df)/len(df)*100:.1f}%)")

    # Generate dataset summary JSON
    summary = {
        "total_records": len(df),
        "seed": RANDOM_SEED,
        "splits": {
            "train": {"count": len(train_df), "percentage": 70.0},
            "validation": {"count": len(val_df), "percentage": 15.0},
            "test": {"count": len(test_df), "percentage": 15.0},
        },
        "class_counts": df["class_label"].value_counts().to_dict(),
        "category_counts": df["product_category"].value_counts().to_dict(),
        "anomaly_statistics": {
            "serial_mismatches": int(df["serial_mismatch_flag"].sum()),
            "date_contradictions": int(df["date_contradiction_flag"].sum()),
            "excluded_damages": int(df["excluded_damage"].sum()),
            "missing_receipts": int((~df["receipt_uploaded"]).sum()),
            "unauthorized_repairs": int((~df["previous_repair_authorized"]).sum()),
            "duplicate_claims": int(df["duplicate_claim_flag"].sum()),
        },
        "generated_at": datetime.now().isoformat(),
    }

    summary_path = os.path.join(DATA_DIR, "dataset_summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"Saved Summary: {summary_path}")
    return df, train_df, val_df, test_df


if __name__ == "__main__":
    generate_dataset(2500)
