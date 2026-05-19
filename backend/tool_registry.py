"""
Tool Registry (Optimised)
=========================
The old architecture had 20 individual tool functions — one per question.
The new architecture uses a single generic tool: `run_analytics_query`.

The LLM generates pandas code on-the-fly for ANY question, so no new
Python functions are needed when adding new questions.

This file is kept for backward compatibility with the /tools API endpoint.
"""
from typing import Dict, List, Any


def get_tool_descriptions() -> List[Dict[str, str]]:
    """Return the single generic tool description for the /tools endpoint."""
    return [
        {
            "name": "run_analytics_query",
            "description": (
                "A universal analytics tool. The LLM generates pandas code on-the-fly "
                "to answer any supply chain question against the Summit Coffee Co. datasets "
                "(transactions, products BOM, pricing tiers, customers, shipping, budget). "
                "No new tool functions are needed for new questions."
            ),
            "capabilities": [
                "SKU margin analysis (top/bottom performers)",
                "Customer profitability (fully-loaded margin)",
                "Pricing tier vs actual price analysis",
                "Pricing anomaly detection",
                "Channel profitability comparison",
                "Shipping cost analysis (carrier, service type, customer)",
                "Budget vs actual (plan vs actual)",
                "Scenario modelling (tariff impact, tier changes)",
                "Monthly P&L",
                "Executive dashboard / KPI summary",
                "Any ad-hoc supply chain question",
            ],
        }
    ]
