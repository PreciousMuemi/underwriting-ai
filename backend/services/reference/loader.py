import json
import os
from functools import lru_cache
from typing import Any, Dict

BASE_DIR = os.path.dirname(__file__)
REF_FILE = os.path.join(BASE_DIR, 'motor_ke.json')


@lru_cache(maxsize=1)
def get_motor_reference() -> Dict[str, Any]:
    """Load and cache the motor KE reference JSON."""
    with open(REF_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)
