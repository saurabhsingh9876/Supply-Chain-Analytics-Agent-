"""
Data Loader Module
Loads and caches all CSV data sources for the Supply Chain Analytics Agent.
"""

import os
import pandas as pd
from functools import lru_cache
from typing import Dict

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _load_csv(filename: str) -> pd.DataFrame:
    """Load a CSV file from the data directory."""
    path = os.path.join(DATA_DIR, filename)
    return pd.read_csv(path)


# Use module-level cache so data is loaded once per process
_cache: Dict[str, pd.DataFrame] = {}


def get_products_bom() -> pd.DataFrame:
    if "bom" not in _cache:
        _cache["bom"] = _load_csv("products_bom.csv")
    return _cache["bom"].copy()


def get_pricing_tiers() -> pd.DataFrame:
    if "pricing" not in _cache:
        _cache["pricing"] = _load_csv("pricing_tiers.csv")
    return _cache["pricing"].copy()


def get_customers() -> pd.DataFrame:
    if "customers" not in _cache:
        _cache["customers"] = _load_csv("customers.csv")
    return _cache["customers"].copy()


def get_transactions() -> pd.DataFrame:
    if "transactions" not in _cache:
        df = _load_csv("transactions.csv")
        df["date"] = pd.to_datetime(df["date"])
        df["month"] = df["date"].dt.to_period("M").astype(str)
        _cache["transactions"] = df
    return _cache["transactions"].copy()


def get_shipping() -> pd.DataFrame:
    if "shipping" not in _cache:
        df = _load_csv("shipping.csv")
        df["date"] = pd.to_datetime(df["date"])
        df["month"] = df["date"].dt.to_period("M").astype(str)
        _cache["shipping"] = df
    return _cache["shipping"].copy()


def get_budget() -> pd.DataFrame:
    if "budget" not in _cache:
        _cache["budget"] = _load_csv("budget.csv")
    return _cache["budget"].copy()


def get_all_data() -> Dict[str, pd.DataFrame]:
    """Return all datasets as a dictionary."""
    return {
        "products_bom": get_products_bom(),
        "pricing_tiers": get_pricing_tiers(),
        "customers": get_customers(),
        "transactions": get_transactions(),
        "shipping": get_shipping(),
        "budget": get_budget(),
    }


def clear_cache():
    """Clear the data cache (useful for testing)."""
    _cache.clear()
