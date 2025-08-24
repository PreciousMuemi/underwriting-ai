from datetime import datetime
from typing import Any, Dict, List, Tuple

from backend.services.reference.loader import get_motor_reference


def compute_vehicle_age(coverage: Dict[str, Any]) -> int:
    year = coverage.get('vehicle_year') or coverage.get('year')
    try:
        y = int(year)
    except Exception:
        return -1
    return max(0, datetime.utcnow().year - y)


def issuance_prechecks(coverage: Dict[str, Any], cover_type: str) -> Tuple[bool, Dict[str, Any]]:
    """
    Returns (ok, details). `details` includes missing_requirements list when not ok.
    Expects `coverage` to contain status booleans like full_premium_paid, proposal_form_received,
    valuation_done, mechanical_assessment_done if applicable.
    """
    ref = get_motor_reference()
    rules = ref.get('issuance_rules', {})

    missing: List[str] = []

    # Full premium paid
    if rules.get('full_premium_before_issue'):
        if not bool(coverage.get('full_premium_paid')):
            missing.append('full_premium_paid')

    # Proposal form
    if rules.get('proposal_form_required'):
        if not bool(coverage.get('proposal_form_received')):
            missing.append('proposal_form_received')

    # Valuation
    val_rule = rules.get('valuation', {})
    req_for = set(val_rule.get('required_for_cover_types', []))
    if cover_type in req_for:
        if not bool(coverage.get('valuation_done')):
            missing.append('valuation_done')

    # Mechanical assessment by age
    mech_rule = rules.get('mechanical_assessment', {})
    min_age = mech_rule.get('min_age')
    if isinstance(min_age, int) and min_age > 0:
        age = compute_vehicle_age(coverage)
        if age >= min_age and not bool(coverage.get('mechanical_assessment_done')):
            missing.append('mechanical_assessment_done')

    ok = len(missing) == 0
    return ok, {"missing_requirements": missing}


def validate_motor_payload(payload: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
    """
    Validate motor-related fields in payload.
    Returns (ok, details). details has 'errors' list and 'normalized' dict when ok.
    Expected keys in payload:
      - vehicle_category: str
      - cover_type: str
      - term_months: int
      - add_ons: list[str] or dict[str, Any]
      - vehicle_value (optional, required for comprehensive per rules)
      - windscreen_sum_insured (when windscreen add-on selected and requires amount)
      - coverage: dict (may include vehicle_year etc.)
    """
    ref = get_motor_reference()
    errors: List[str] = []

    # Controlled vocab
    categories = set(ref.get('vehicle_categories', []))
    covers = set(ref.get('cover_types', []))
    terms = set(ref.get('terms', []))
    addons_ref: Dict[str, Any] = ref.get('addons', {})

    cat = payload.get('vehicle_category')
    cov = payload.get('cover_type')
    term = payload.get('term_months', 12)
    add_ons = payload.get('add_ons') or []

    if cat not in categories:
        errors.append(f"vehicle_category must be one of: {sorted(categories)}")
    if cov not in covers:
        errors.append(f"cover_type must be one of: {sorted(covers)}")
    try:
        term_int = int(term)
    except Exception:
        term_int = None
    if term_int not in terms:
        errors.append(f"term_months must be one of: {sorted(terms)}")

    # Normalize add_ons to list of keys
    if isinstance(add_ons, dict):
        selected_addons = [k for k, v in add_ons.items() if v]
    elif isinstance(add_ons, list):
        selected_addons = list(add_ons)
    else:
        errors.append('add_ons must be a list or object of flags')
        selected_addons = []

    # Add-on eligibility and limits
    for key in selected_addons:
        if key not in addons_ref:
            errors.append(f"Unknown add-on: {key}")
            continue
        cfg = addons_ref[key]
        allowed = set(cfg.get('allowed_cover_types', []))
        if allowed and cov not in allowed:
            errors.append(f"Add-on '{key}' not allowed for cover_type '{cov}'")
        # Optional category constraints per add-on
        allowed_cats = set(cfg.get('allowed_categories', []))
        if allowed_cats and cat not in allowed_cats:
            errors.append(f"Add-on '{key}' not allowed for vehicle_category '{cat}'")
        # Back-compat: legacy global validation for loss_of_use
        if key == 'loss_of_use':
            legacy_cats = set((ref.get('validation') or {}).get('loss_of_use_allowed_categories', []))
            if legacy_cats and cat not in legacy_cats:
                errors.append(f"Add-on '{key}' not allowed for vehicle_category '{cat}'")
        if cfg.get('requires_amount'):
            amount_field = f"{key}_sum_insured" if key != 'windscreen' else 'windscreen_sum_insured'
            amt = payload.get(amount_field)
            if amt is None:
                errors.append(f"{amount_field} is required when '{key}' add-on is selected")
            else:
                try:
                    amt_val = float(amt)
                except Exception:
                    errors.append(f"{amount_field} must be a number")
                    amt_val = None
                # Validate limits if vehicle_value present
                limits = cfg.get('limits', {})
                if amt_val is not None and limits:
                    v = payload.get('vehicle_value')
                    try:
                        vehicle_value = float(v) if v is not None else None
                    except Exception:
                        vehicle_value = None
                    if limits.get('type') == 'percent_of_vehicle_value' and vehicle_value:
                        min_pct = float(limits.get('min_pct', 0))
                        max_pct = float(limits.get('max_pct', 100))
                        min_amt = vehicle_value * (min_pct / 100.0)
                        max_amt = vehicle_value * (max_pct / 100.0)
                        if not (min_amt <= amt_val <= max_amt):
                            errors.append(
                                f"{amount_field} must be between {min_pct}% and {max_pct}% of vehicle_value"
                            )

    # Rule: comprehensive requires vehicle_value
    if ref.get('validation', {}).get('comprehensive_requires_vehicle_value') and cov == 'Comprehensive':
        if payload.get('vehicle_value') in (None, '', 0):
            errors.append('vehicle_value is required for Comprehensive cover')

    ok = len(errors) == 0
    normalized = {
        'vehicle_category': cat,
        'cover_type': cov,
        'term_months': term_int or term,
        'add_ons': selected_addons,
    }
    return ok, ({'errors': errors} if not ok else {'normalized': normalized})
