"""
MediGuard AI - Medicine Verification Module
Generates and verifies QR codes and barcodes to ensure the right medication is taken.
"""

import qrcode
from io import BytesIO
from typing import Dict, Any

def generate_medicine_qr(medicine_id: str, name: str, dosage: str) -> BytesIO:
    """Generates a QR code image stream for a specific prescription."""
    payload = f"MEDIGUARD|{medicine_id}|{name}|{dosage}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0B1F33", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer

def verify_medicine_scan(expected_medicine: Dict[str, Any], scanned_code: str) -> Dict[str, Any]:
    """
    Compares scanned QR / Barcode data against expected medicine metadata.
    Returns: status ('Verified', 'Wrong Medicine', 'Verification Failed')
    """
    if not scanned_code:
        return {"status": "Verification Failed", "message": "No barcode or QR data provided."}

    scanned_clean = scanned_code.strip()
    expected_qr = str(expected_medicine.get('qr_code_data', '')).strip()
    expected_barcode = str(expected_medicine.get('barcode', '')).strip()
    expected_name = str(expected_medicine.get('name', '')).lower()

    if (expected_qr and expected_qr in scanned_clean) or \
       (expected_barcode and expected_barcode == scanned_clean) or \
       (f"MEDIGUARD|{expected_medicine.get('id')}" in scanned_clean) or \
       (expected_name in scanned_clean.lower()):
        return {
            "status": "Verified",
            "message": f"CORRECT MEDICINE VERIFIED: {expected_medicine.get('name')} ({expected_medicine.get('dosage')})",
            "is_correct": True
        }
    else:
        return {
            "status": "Wrong Medicine",
            "message": f"CRITICAL WARNING: Scanned item does not match expected prescription: {expected_medicine.get('name')}",
            "is_correct": False
        }
