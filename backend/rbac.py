"""
Role-Based Access Control (RBAC)
=================================
Defines 3 roles with different CSV file access permissions.
The PreToolUse hook inspects every tool call before execution
and returns a deny decision for unauthorized data access.

Roles:
  executive  → full access to all 6 data files
  analyst    → access to transactions, shipping, budget, products_bom
  viewer     → access to transactions and budget only

DataFrame variable names used in generated code:
  bom        → products_bom.csv
  pricing    → pricing_tiers.csv
  customers  → customers.csv
  txn        → transactions.csv
  shipping   → shipping.csv
  budget     → budget.csv
"""

from typing import Dict, List, Tuple

# ---------------------------------------------------------------------------
# Role definitions — maps role name → allowed DataFrame variable names
# ---------------------------------------------------------------------------
ROLES: Dict[str, Dict] = {
    "executive": {
        "label": "Executive",
        "description": "Full access to all 6 data sources",
        "allowed_dataframes": {"bom", "pricing", "customers", "txn", "shipping", "budget"},
        "allowed_files": [
            "products_bom.csv",
            "pricing_tiers.csv",
            "customers.csv",
            "transactions.csv",
            "shipping.csv",
            "budget.csv",
        ],
    },
    "analyst": {
        "label": "Analyst",
        "description": "Access to transactions, shipping, budget, and product costs. No customer or pricing data.",
        "allowed_dataframes": {"bom", "txn", "shipping", "budget"},
        "allowed_files": [
            "products_bom.csv",
            "transactions.csv",
            "shipping.csv",
            "budget.csv",
        ],
    },
    "viewer": {
        "label": "Viewer",
        "description": "Read-only access to transactions and budget summaries only.",
        "allowed_dataframes": {"txn", "budget"},
        "allowed_files": [
            "transactions.csv",
            "budget.csv",
        ],
    },
}

# Map DataFrame variable name → human-readable file name (for error messages)
DATAFRAME_TO_FILE: Dict[str, str] = {
    "bom":       "products_bom.csv",
    "pricing":   "pricing_tiers.csv",
    "customers": "customers.csv",
    "txn":       "transactions.csv",
    "shipping":  "shipping.csv",
    "budget":    "budget.csv",
}

# All known DataFrame variable names
ALL_DATAFRAMES = set(DATAFRAME_TO_FILE.keys())


def get_role(role_name: str) -> Dict:
    """Return role config. Defaults to 'viewer' if role is unknown."""
    return ROLES.get(role_name.lower(), ROLES["viewer"])


def detect_dataframes_in_code(code: str) -> List[str]:
    """
    Detect which DataFrame variables are referenced in the generated pandas code.
    Looks for standalone variable names (not substrings of other words).
    Returns list of detected DataFrame names.
    """
    import re
    detected = []
    for df_name in ALL_DATAFRAMES:
        # Match the variable name as a whole word (not part of another identifier)
        pattern = r'\b' + re.escape(df_name) + r'\b'
        if re.search(pattern, code):
            detected.append(df_name)
    return detected


def pre_tool_use_hook(role_name: str, code: str) -> Tuple[bool, str]:
    """
    PreToolUse hook — inspects generated pandas code before execution.

    Args:
        role_name: The user's assigned role ('executive', 'analyst', 'viewer')
        code:      The pandas code string Claude generated

    Returns:
        (allowed: bool, message: str)
        - If allowed=True:  proceed with execution
        - If allowed=False: deny with clear error message
    """
    role = get_role(role_name)
    allowed_dfs = role["allowed_dataframes"]

    # Detect which DataFrames the code tries to use
    used_dfs = detect_dataframes_in_code(code)

    # Find any DataFrames the role is NOT allowed to access
    blocked = [df for df in used_dfs if df not in allowed_dfs]

    if blocked:
        blocked_files = [DATAFRAME_TO_FILE[df] for df in blocked]
        role_label = role["label"]
        allowed_files = role["allowed_files"]

        deny_message = (
            f"Access Denied: Your role '{role_label}' does not have permission to access "
            f"{', '.join(blocked_files)}. "
            f"Your role only allows access to: {', '.join(allowed_files)}. "
            f"Please ask an Executive or Analyst for this information."
        )
        return False, deny_message

    return True, "Access granted"


def get_roles_info() -> List[Dict]:
    """Return role info for the /roles API endpoint."""
    return [
        {
            "role": role_key,
            "label": role_val["label"],
            "description": role_val["description"],
            "allowed_files": role_val["allowed_files"],
        }
        for role_key, role_val in ROLES.items()
    ]
