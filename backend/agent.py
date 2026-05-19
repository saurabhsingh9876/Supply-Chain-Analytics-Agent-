"""
Supply Chain Analytics Agent  (Claude Agent SDK — Generic Tool Architecture)
=============================================================================
Driven by Anthropic's Claude via the `anthropic` Python SDK (Claude Agent SDK).

Instead of 20 hardcoded tool functions, the agent uses ONE generic tool:

  run_analytics_query(code: str)
    → Claude writes pandas code on-the-fly
    → code is executed against the pre-loaded dataframes
    → returns table + summary

Adding a new question requires ZERO new Python code.
"""
import json
import os
import time
import logging
from typing import Any, Dict, List, Optional

import anthropic
from tools.generic_tool import run_pandas_code, DATA_SCHEMA

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Anthropic Claude client (Claude Agent SDK)
# ---------------------------------------------------------------------------
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")

# ---------------------------------------------------------------------------
# Claude tool definition — ONE tool for everything
# ---------------------------------------------------------------------------
GENERIC_TOOL_SPEC = [
    {
        "name": "run_analytics_query",
        "description": (
            "Execute a pandas-based analytics query against the Summit Coffee Co. "
            "supply chain data. Write Python code that computes the answer and "
            "assigns the result to `result_df` (DataFrame) and `summary` (str)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": (
                        "Valid Python code using pandas (pd) and numpy (np). "
                        "Must assign: result_df (DataFrame) and summary (str). "
                        "Pre-loaded variables: bom, pricing, customers, txn, shipping, budget."
                    ),
                }
            },
            "required": ["code"],
        },
    }
]

# ---------------------------------------------------------------------------
# System prompt — tells Claude the data schema and coding rules
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = f"""You are a senior supply chain data analyst for Summit Coffee Co.
When given a business question, you MUST call the `run_analytics_query` tool
with Python/pandas code that computes the answer.

{DATA_SCHEMA}

Coding guidelines:
- Always merge on the correct key columns (customer_id, sku_id, transaction_id).
- Use .copy() after filtering to avoid SettingWithCopyWarning.
- Round monetary values to 2 decimal places.
- Sort result_df meaningfully (e.g. descending by revenue or margin).
- Keep result_df concise — aggregate where possible, max 200 rows.
- summary must be a single plain-English sentence with the key number/finding.
- bom.total_cogs is a PER-UNIT cost. To get total COGS for a transaction: total_cogs * quantity.
- Always merge txn with bom on 'sku_id' before computing gross profit or margin.
- Never multiply a string column by a float. Check dtypes before arithmetic.

CRITICAL coding rules (Python 3.11):
1. NEVER use bracket notation inside f-strings. This causes a SyntaxError:
    BAD:  f"value is {{df['col'].mean():.2f}}"
    BAD:  f"value is {{row['col']}}"
   Instead, assign to a variable first:
    GOOD: val = df['col'].mean(); summary = f"value is {{val:.2f}}"
    GOOD: name = row['col']; summary = f"name is {{name}}"

2. The `summary` variable MUST be assigned on a SINGLE LINE. Never split it across lines:
    BAD:  summary = 'Top SKU is ' +
                    sku_name + ' at ' + str(pct) + '%'
    GOOD: summary = f"Top SKU is {{top_sku}} at {{top_pct:.1f}}%"
    GOOD: summary = "Top SKU is " + top_sku + " at " + str(round(top_pct, 1)) + "%"

3. Always compute intermediate variables before using them in summary strings.
4. Always round numbers in the summary to 1-2 decimal places:
    GOOD: top_pct = round(float(top_pct_raw), 1); summary = f"Top SKU margin: {{top_pct}}%"
"""


def plan_and_execute(question: str) -> Dict[str, Any]:
    """
    Main agent loop (powered by Claude Agent SDK):
    1. Claude generates pandas code via tool_use
    2. Code is executed against pre-loaded dataframes
    3. Claude generates narrative analysis from the results
    """
    start = time.time()
    tokens_used = 0
    trace: List[str] = []

    # ------------------------------------------------------------------
    # Step 1: Claude generates pandas code via tool_use
    # ------------------------------------------------------------------
    generated_code: Optional[str] = None
    tool_name = "run_analytics_query"

    try:
        trace.append("Planning: asking Claude to generate analytics code...")
        resp = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": question},
            ],
            tools=GENERIC_TOOL_SPEC,
            tool_choice={"type": "tool", "name": "run_analytics_query"},
        )
        tokens_used += (resp.usage.input_tokens + resp.usage.output_tokens) if resp.usage else 0

        # Extract tool_use block from Claude's response
        for block in resp.content:
            if block.type == "tool_use" and block.name == "run_analytics_query":
                generated_code = block.input.get("code", "")
                trace.append(f"Claude generated code ({len(generated_code)} chars)")
                break

        if not generated_code:
            trace.append("Claude did not generate code")

    except Exception as e:
        trace.append(f"Claude code generation failed: {e}")
        logger.error(f"Claude error: {e}")

    if not generated_code:
        return {
            "tool_name": None,
            "table": [],
            "summary": "Could not generate analytics code for this question.",
            "narrative": "Please rephrase your question or ask about SKU margins, customer profitability, shipping costs, budget tracking, or strategic scenarios.",
            "trace": trace,
            "tokens_used": tokens_used,
            "latency_ms": int((time.time() - start) * 1000),
            "error": "No code generated",
        }

    # ------------------------------------------------------------------
    # Step 2: Execute the generated code
    # ------------------------------------------------------------------
    trace.append("Executing generated pandas code...")
    result = run_pandas_code(generated_code)

    if result.get("error"):
        # Retry once: send the error back to Claude for self-correction
        trace.append(f"Code error — asking Claude to fix: {result['error'][:200]}")
        try:
            # Build the multi-turn conversation with the tool result
            retry_messages = [
                {"role": "user", "content": question},
                {
                    "role": "assistant",
                    "content": [
                        {
                            "type": "tool_use",
                            "id": "call_retry",
                            "name": "run_analytics_query",
                            "input": {"code": generated_code},
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": "call_retry",
                            "content": f"Error: {result['error']}",
                        },
                        {
                            "type": "text",
                            "text": "The code raised an error. Please fix it and call run_analytics_query again with corrected code.",
                        },
                    ],
                },
            ]

            retry_resp = client.messages.create(
                model=MODEL,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=retry_messages,
                tools=GENERIC_TOOL_SPEC,
                tool_choice={"type": "tool", "name": "run_analytics_query"},
            )
            tokens_used += (retry_resp.usage.input_tokens + retry_resp.usage.output_tokens) if retry_resp.usage else 0

            for block in retry_resp.content:
                if block.type == "tool_use" and block.name == "run_analytics_query":
                    fixed_code = block.input.get("code", "")
                    trace.append(f"Claude provided fixed code ({len(fixed_code)} chars)")
                    result = run_pandas_code(fixed_code)
                    generated_code = fixed_code
                    break

        except Exception as e:
            trace.append(f"Retry failed: {e}")

    table = result.get("table", [])
    data_summary = result.get("summary", "")
    trace.append(f"Code returned {len(table)} rows")

    if result.get("error") and not table:
        return {
            "tool_name": tool_name,
            "table": [],
            "summary": f"Execution error: {result.get('error', '')}",
            "narrative": "An error occurred while computing the analysis. The generated code may need adjustment.",
            "trace": trace,
            "tokens_used": tokens_used,
            "latency_ms": int((time.time() - start) * 1000),
            "error": result.get("error"),
        }

    # ------------------------------------------------------------------
    # Step 3: Generate narrative analysis via Claude
    # ------------------------------------------------------------------
    try:
        trace.append("Generating narrative analysis via Claude...")
        table_preview = json.dumps(table[:20], indent=2, default=str)

        narrative_prompt = f"""You are a senior supply chain analyst at Summit Coffee Co.

Question: {question}

Key finding: {data_summary}

Data table (first 20 rows):
{table_preview}

Write a concise, insightful narrative analysis (3-5 paragraphs) that:
1. Directly answers the question with specific numbers from the data
2. Highlights the most important findings and anomalies
3. Provides 2-3 actionable recommendations
4. Uses markdown **bold** for key numbers and findings

Be specific and data-driven."""

        narr_resp = client.messages.create(
            model=MODEL,
            max_tokens=800,
            system="You are a senior supply chain analyst. Be concise, specific, and actionable.",
            messages=[
                {"role": "user", "content": narrative_prompt},
            ],
        )
        tokens_used += (narr_resp.usage.input_tokens + narr_resp.usage.output_tokens) if narr_resp.usage else 0
        narrative = narr_resp.content[0].text
        trace.append("Narrative generated successfully by Claude")
    except Exception as e:
        logger.error(f"Narrative generation failed: {e}")
        narrative = data_summary

    return {
        "tool_name": tool_name,
        "table": table,
        "summary": data_summary,
        "narrative": narrative,
        "trace": trace,
        "tokens_used": tokens_used,
        "latency_ms": int((time.time() - start) * 1000),
        "extra_data": {"generated_code": generated_code},
    }
