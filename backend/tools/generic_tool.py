"""
Generic Analytics Tool
======================
A single tool that can answer ANY supply chain question by:
1. Letting the LLM generate pandas code to compute the answer
2. Executing that code safely against the loaded dataframes
3. Returning a structured table + summary

This replaces the need to write a new Python function for every question.
"""
import traceback
import pandas as pd
import numpy as np
from typing import Any, Dict

from data_loader import (
    get_products_bom, get_pricing_tiers, get_customers,
    get_transactions, get_shipping, get_budget,
)


import re


def _join_broken_lines(code: str) -> str:
    """
    Pre-pass: join lines that are broken mid-expression.
    Handles cases like:
        summary = f'text {result_df.iloc[0][
            'channel']}...'
    by joining them into a single line.
    """
    lines = code.splitlines()
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Count unmatched brackets/parens — if open > close, join next line
        opens = line.count('(') + line.count('[') + line.count('{')
        closes = line.count(')') + line.count(']') + line.count('}')
        # Only join if we're inside a string context (f-string or summary line)
        if (opens > closes and
                (re.search(r'f["\']', line) or re.match(r'\s*summary\s*=', line))):
            joined = line.rstrip()
            i += 1
            while i < len(lines) and opens > closes:
                next_line = lines[i].strip()
                joined += " " + next_line
                opens += next_line.count('(') + next_line.count('[') + next_line.count('{')
                closes += next_line.count(')') + next_line.count(']') + next_line.count('}')
                i += 1
            result.append(joined)
        else:
            result.append(line)
            i += 1
    return "\n".join(result)


def _replace_summary_line(code: str) -> str:
    """
    Replace any `summary = ...` line that uses .iloc, .values, or df['col']
    inside an f-string with a safe deferred version that builds the summary
    from result_df after it's computed.

    This is the nuclear option — if the summary line is too complex, we
    replace it with a simple placeholder and let the narrative LLM handle it.
    """
    lines = code.splitlines()
    result = []
    for line in lines:
        stripped = line.strip()
        # Detect summary lines with risky patterns
        if (re.match(r'summary\s*=', stripped) and
                re.search(r'(\.iloc|\.values|\.loc|\[[\'"]\w)', stripped)):
            indent = len(line) - len(line.lstrip())
            prefix = " " * indent
            # Replace with a safe summary that uses result_df shape
            result.append(
                f'{prefix}summary = f"Analysis complete: {{len(result_df)}} rows computed."'
            )
        else:
            result.append(line)
    return "\n".join(result)


def _sanitize_code(code: str) -> str:
    """
    Fix common LLM code generation mistakes before execution.

    Problems fixed:
    1. Multi-line broken expressions (f-strings split across lines)
    2. f-strings with bracket notation (SyntaxError in Python ≤ 3.11)
    3. Multi-line string concatenation with + at end of line
    """
    # Pre-pass 1: join broken multi-line expressions
    code = _join_broken_lines(code)
    # Pre-pass 2: replace risky summary lines with safe placeholders
    code = _replace_summary_line(code)

    lines = code.splitlines()
    fixed_lines = []
    _counter = 0

    # Pattern: inside an f-string brace, any expression containing [ ... ]
    FSTRING_BRACKET = re.compile(
        r'\{([^{}]*\[[^\[\]]*\][^{}]*?)(:[^{}]*)?\}'
    )

    i = 0
    while i < len(lines):
        line = lines[i]
        indent = len(line) - len(line.lstrip())
        prefix = " " * indent

        # --- Fix 1: f-string with bracket access inside braces ---
        if re.search(r'f["\']', line) and FSTRING_BRACKET.search(line):
            pre_lines = []

            def _replacer(m):
                nonlocal _counter
                _counter += 1
                expr = m.group(1)
                fmt = m.group(2) or ""
                varname = f"_fstr_tmp_{_counter}"
                pre_lines.append(f"{prefix}{varname} = {expr}")
                return "{" + varname + fmt + "}"

            new_line = FSTRING_BRACKET.sub(_replacer, line)
            fixed_lines.extend(pre_lines)
            fixed_lines.append(new_line)
            i += 1

        # --- Fix 2: summary = 'text' + \n  (broken multi-line concat) ---
        elif (re.match(r'\s*summary\s*=\s*[\'"]', line)
              and line.rstrip().endswith("+")):
            joined = line.rstrip()[:-1].strip()  # remove trailing +
            i += 1
            while i < len(lines):
                next_line = lines[i].strip()
                if next_line.endswith("+"):
                    joined += " " + next_line[:-1].strip()
                    i += 1
                else:
                    joined += " " + next_line
                    i += 1
                    break
            fixed_lines.append(f"{prefix}summary = {joined}")

        else:
            fixed_lines.append(line)
            i += 1

    return "\n".join(fixed_lines)


def _aggressive_sanitize(code: str) -> str:
    """
    Second-pass sanitizer called only when the code fails to compile.
    Rewrites ALL f-strings to use pre-assigned variables, eliminating
    any bracket/subscript access inside f-string braces.
    """
    # Strategy: find every f-string assignment and rewrite it safely
    # Replace f"...{expr}..." where expr contains [ with a variable
    result_lines = []
    counter = [0]

    for line in code.splitlines():
        # If line contains an f-string with any { } that has [ inside
        if re.search(r'f["\']', line) and re.search(r'\{[^}]*\[[^}]*\}', line):
            indent = len(line) - len(line.lstrip())
            prefix = " " * indent
            new_parts = []
            pre_assigns = []

            # Find the f-string content
            # Replace all {expr} where expr has [ with a temp var
            def rewrite(m):
                counter[0] += 1
                full_expr = m.group(0)   # e.g. {df['col'].mean():.2f}
                inner = m.group(1)       # e.g. df['col'].mean()
                fmt = m.group(2) or ""   # e.g. :.2f
                varname = f"_ag_tmp_{counter[0]}"
                pre_assigns.append(f"{prefix}{varname} = {inner}")
                return "{" + varname + fmt + "}"

            new_line = re.sub(
                r'\{([^{}]*\[[^\[\]]*\][^{}]*?)(:[^{}]*)?\}',
                rewrite,
                line,
            )
            result_lines.extend(pre_assigns)
            result_lines.append(new_line)
        else:
            result_lines.append(line)

    return "\n".join(result_lines)


def run_pandas_code(code: str) -> Dict[str, Any]:
    """
    Execute LLM-generated pandas code in a sandboxed namespace.

    The code must assign:
      - `result_df`  : a pandas DataFrame (becomes the table)
      - `summary`    : a plain-English string summarising the key finding

    All six dataframes are pre-loaded and available as local variables:
      bom, pricing, customers, txn, shipping, budget

    Returns {"table": [...], "summary": "..."}
    """
    # Auto-fix common f-string issues before execution
    code = _sanitize_code(code)

    # Pre-load all data into the execution namespace
    namespace: Dict[str, Any] = {
        "pd": pd,
        "np": np,
        "bom": get_products_bom(),
        "pricing": get_pricing_tiers(),
        "customers": get_customers(),
        "txn": get_transactions(),
        "shipping": get_shipping(),
        "budget": get_budget(),
        # helpers
        "result_df": pd.DataFrame(),
        "summary": "",
    }

    # Try to compile first — if it fails with SyntaxError, apply aggressive sanitization
    try:
        compile(code, "<llm_code>", "exec")
    except SyntaxError:
        code = _aggressive_sanitize(code)

    try:
        exec(compile(code, "<llm_code>", "exec"), namespace)  # noqa: S102
    except Exception:
        error_msg = traceback.format_exc()
        # Log the generated code for debugging
        numbered = "\n".join(f"{i+1:3}: {l}" for i, l in enumerate(code.splitlines()))
        import logging
        logging.getLogger(__name__).error(
            f"Code execution failed:\n{error_msg}\n--- Generated code ---\n{numbered}"
        )
        return {
            "table": [],
            "summary": f"Code execution error:\n{error_msg}",
            "error": error_msg,
        }

    result_df = namespace.get("result_df", pd.DataFrame())
    summary = namespace.get("summary", "")

    if not isinstance(result_df, pd.DataFrame):
        # Allow the code to return a list of dicts directly
        if isinstance(result_df, list):
            result_df = pd.DataFrame(result_df)
        else:
            result_df = pd.DataFrame()

    # Round all float columns to 2 decimal places for clean display
    for col in result_df.select_dtypes(include="float").columns:
        result_df[col] = result_df[col].round(2)

    table = result_df.to_dict(orient="records")
    return {"table": table, "summary": str(summary)}


# ---------------------------------------------------------------------------
# Schema description sent to the LLM so it knows what columns exist
# ---------------------------------------------------------------------------
DATA_SCHEMA = """
Available DataFrames (already loaded — do NOT call any load functions):

1. bom  — Bill of Materials / product cost data
   Columns (all exact names):
     sku_id          (str)   — e.g. "SKU001"
     sku_name        (str)   — e.g. "Colombian Supremo 12oz"
     category        (str)   — e.g. "whole_bean", "ground", "pods"
     weight_oz       (int)   — product weight in ounces
     coffee_cost     (float) — per-unit coffee ingredient cost in USD
     packaging_cost  (float) — per-unit packaging cost in USD
     labor_cost      (float) — per-unit labor cost in USD
     total_cogs      (float) — per-unit total COGS = coffee_cost + packaging_cost + labor_cost
     msrp            (float) — manufacturer suggested retail price per unit in USD

2. pricing  — customer tier pricing
   Columns: sku_id (str), tier (str: T0/T1/T2/MSRP), unit_price (float)

3. customers  — customer master data
   Columns:
     customer_id      (str) — e.g. "C001"
     customer_name    (str)
     tier             (str) — T0/T1/T2
     channel          (str) — "wholesale", "shopify", "amazon"
     region           (str) — e.g. "West", "Northeast"
     account_manager  (str)

4. txn  — sales transactions
   Columns:
     transaction_id    (str)
     date              (datetime)
     month             (str YYYY-MM)
     customer_id       (str)
     sku_id            (str)
     quantity          (int)   — units sold
     unit_price_actual (float) — actual price charged per unit
     discount_applied  (float) — discount amount per unit
     net_revenue       (float) — total revenue = unit_price_actual * quantity

5. shipping  — shipment records
   Columns:
     shipment_id      (str)
     transaction_id   (str)  — join key to txn
     date             (datetime)
     month            (str YYYY-MM)
     carrier          (str) — "UPS", "FedEx", "USPS"
     service_type     (str) — "standard", "expedited", "overnight", "freight"
     weight_lbs       (float)
     shipping_cost    (float) — total shipping cost for this shipment in USD
     origin_zip       (int)
     destination_zip  (int)

6. budget  — monthly budget vs actuals
   Columns:
     month          (str YYYY-MM)
     category       (str) — "revenue", "coffee_cost", "packaging_cost", "labor_cost", "shipping"
     budget_amount  (float)
     actual_amount  (float)

Join keys:
  txn ↔ bom       : on "sku_id"
  txn ↔ customers : on "customer_id"
  txn ↔ shipping  : on "transaction_id"
  txn ↔ pricing   : on ["sku_id", "tier"] after merging customers to get tier

Gross margin calculation (ALWAYS use this pattern):
  merged = txn.merge(bom[['sku_id','total_cogs']], on='sku_id')
  merged['gross_profit'] = merged['net_revenue'] - (merged['total_cogs'] * merged['quantity'])
  merged['gross_margin_pct'] = (merged['gross_profit'] / merged['net_revenue'] * 100).round(2)

Rules:
- Assign your final result to `result_df` (a pandas DataFrame).
- Assign a one-sentence key finding to `summary` (a plain string).
- Do NOT import anything — pd and np are already available.
- Do NOT call any get_* functions — use the pre-loaded variables above.
- Keep result_df to ≤ 200 rows; aggregate if needed.
- Margin/percentage columns must be expressed as PERCENTAGES (0–100), not decimals (0–1).
- All dollar amounts are in USD.
- Always use pd.to_numeric(..., errors='coerce') when doing arithmetic on columns that might be strings.
"""
