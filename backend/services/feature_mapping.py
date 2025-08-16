from typing import List, Tuple, Any, Dict

# Single source of truth for model input order
EXPECTED_FEATURES: List[str] = [
    'KIDSDRIV', 'BIRTH', 'AGE', 'HOMEKIDS', 'YOJ', 'INCOME', 'PARENT1',
    'HOME_VAL', 'MSTATUS', 'GENDER', 'EDUCATION', 'OCCUPATION', 'TRAVTIME',
    'CAR_USE', 'BLUEBOOK', 'TIF', 'CAR_TYPE', 'RED_CAR', 'OLDCLAIM',
    'CLM_FREQ', 'REVOKED', 'MVR_PTS', 'CLM_AMT', 'CAR_AGE', 'URBANICITY'
]


def extract_features(payload: Dict[str, Any]) -> Tuple[List[float], List[str]]:
    """
    Validates and orders features from payload according to EXPECTED_FEATURES.
    Returns (values, missing_features)
    """
    values: List[float] = []
    missing: List[str] = []

    for f in EXPECTED_FEATURES:
        if f in payload:
            values.append(payload[f])
        else:
            missing.append(f)
    return values, missing
