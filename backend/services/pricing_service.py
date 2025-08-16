from typing import Dict, Any

BASE_PREMIUM = 8000  # KES


def _risk_multiplier(risk_score: int) -> float:
    if risk_score == 0:
        return 0.8
    if risk_score == 1:
        return 1.2
    return 1.8


def _age_factor(age: int) -> float:
    if age < 25:
        return 1.3
    if age > 50:
        return 0.9
    return 1.0


def _car_value_factor(bluebook: float) -> float:
    if bluebook > 15000:
        return 1.2
    if bluebook < 5000:
        return 0.9
    return 1.0


def _claims_factor(clm_freq: int) -> float:
    return 1.0 + (clm_freq * 0.2)


def _credit_factor(credit_score: int | None) -> float:
    if credit_score is None:
        return 1.0
    if credit_score >= 750:
        return 0.9
    if credit_score >= 650:
        return 1.0
    if credit_score >= 550:
        return 1.1
    return 1.3


def _driving_factor(driving_patterns: Dict[str, Any] | None) -> float:
    if not driving_patterns:
        return 1.0
    speeding = float(driving_patterns.get('speeding_incidents', 0)) * 0.05
    braking = float(driving_patterns.get('harsh_braking_freq', 0)) * 0.03
    accel = float(driving_patterns.get('aggressive_acceleration', 0)) * 0.02
    return min(1.0 + speeding + braking + accel, 1.5)


def calculate_premium(risk_score: int, user_data: Dict[str, Any],
                      credit_score: int | None = None,
                      driving_patterns: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Returns a breakdown and total premium.
    """
    age = int(user_data.get('AGE', 25))
    bluebook = float(user_data.get('BLUEBOOK', 7000))
    clm_freq = int(user_data.get('CLM_FREQ', 0))

    parts = {
        'base': BASE_PREMIUM,
        'risk_multiplier': _risk_multiplier(risk_score),
        'age_factor': _age_factor(age),
        'car_value_factor': _car_value_factor(bluebook),
        'claims_factor': _claims_factor(clm_freq),
        'credit_factor': _credit_factor(credit_score),
        'driving_factor': _driving_factor(driving_patterns),
    }

    total = int(parts['base'] * parts['risk_multiplier'] * parts['age_factor'] *
                parts['car_value_factor'] * parts['claims_factor'] *
                parts['credit_factor'] * parts['driving_factor'])
    total = max(total, 5000)

    return {
        'breakdown': parts,
        'total': total
    }
