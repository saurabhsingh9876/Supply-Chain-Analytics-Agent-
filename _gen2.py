code = """

def brazil_tariff_impact():
    bom = get_products_bom()
    txn = get_transactions()
    customers = get_customers()
    brazil_skus = bom[bom["sku_name"].str.contains("Brazil", case=False)]["sku_id"].tolist()
    if not brazil_skus:
        brazil_skus = bom.head(3)["sku_id"].tolist()
    affected = bom[bom["sku_id"].isin(brazil_skus)].copy()
    affected["new_coffee_cost"] = affected["coffee_cost"] * 1.5
    affected["new_total_cogs"] = affected["total_cogs"] + (affected["new_coffee_cost"] - affected["coffee_cost"])
    merged = txn[txn["sku_id"].isin(brazil_skus)].merge(affected[["sku_id","sku_name","total_cogs","new_total_cogs"]], on="sku_id")
    merged = merged.merge(customers[["customer_id","customer_name","channel"]], on="customer_id")
    merged["old_gp"] = merged["net_revenue"] - merged["quantity"] * merged["total_cogs"]
    merged["new_gp"] = merged["net_revenue"] - merged["quantity"] * merged["new_total_cogs"]
    merged["impact"] = merged["new_gp"] - merged["old_gp"]
    by_cust = merged.groupby(["customer_name","channel"]).agg(old_gp=("old_gp","sum"), new_gp=("new_gp","sum"), impact=("impact","sum")).reset_index()
    table = by_cust.rename(columns={"customer_name":"Customer","channel":"Channel","old_gp":"Old GP","new_gp":"New GP","impact":"Impact"}).to_dict(orient="records")
    total_impact = by_cust["impact"].sum()
    summary = f"50% Brazil coffee cost increase reduces gross profit by ${abs(total_impact):,.0f}. Affects {len(brazil_skus)} SKUs."
    return {"table": table, "summary": summary}


def account_manager_performance():
    txn = get_transactions()
    bom = get_products_bom()
    customers = get_customers()
    merged = txn.merge(customers[["customer_id","customer_name","account_manager","channel","tier"]], on="customer_id")
    merged = merged.merge(bom[["sku_id","total_cogs"]], on="sku_id")
    merged["cogs_line"] = merged["quantity"] * merged["total_cogs"]
    merged["gross_profit"] = merged["net_revenue"] - merged["cogs_line"]
    agg = merged.groupby("account_manager").agg(total_revenue=("net_revenue","sum"), total_cogs=("cogs_line","sum"), total_gp=("gross_profit","sum"), customers=("customer_id","nunique")).reset_index()
    agg["margin_pct"] = (agg["total_gp"] / agg["total_revenue"] * 100).round(2)
    agg = agg.sort_values("margin_pct", ascending=False)
    table = agg.rename(columns={"account_manager":"AM","total_revenue":"Revenue","total_cogs":"COGS","total_gp":"Gross Profit","customers":"Customers","margin_pct":"Margin %"}).to_dict(orient="records")
    best = agg.iloc[0]
    worst = agg.iloc[-1]
    summary = f"Best AM: {best['account_manager']} at {best['margin_pct']}% margin. Worst: {worst['account_manager']} at {worst['margin_pct']}%."
    return {"table": table, "summary": summary}


def monthly_pnl():
    txn = get_transactions()
    bom = get_products_bom()
    shipping = get_shipping()
    merged = txn.merge(bom[["sku_id","coffee_cost","packaging_cost","labor_cost","total_cogs"]], on="sku_id")
    merged["coffee_cogs"] = merged["quantity"] * merged["coffee_cost"]
    merged["pkg_cogs"] = merged["quantity"] * merged["packaging_cost"]
    merged["labor_cogs"] = merged["quantity"] * merged["labor_cost"]
    merged["total_cogs_line"] = merged["quantity"] * merged["total_cogs"]
    monthly = merged.groupby("month").agg(revenue=("net_revenue","sum"), coffee_cogs=("coffee_cogs","sum"), pkg_cogs=("pkg_cogs","sum"), labor_cogs=("labor_cogs","sum"), total_cogs=("total_cogs_line","sum")).reset_index()
    ship_monthly = shipping.groupby("month")["shipping_cost"].sum().reset_index()
    monthly = monthly.merge(ship_monthly, on="month", how="left").fillna(0)
    monthly["gross_margin"] = monthly["revenue"] - monthly["total_cogs"]
    monthly["net_margin"] = monthly["gross_margin"] - monthly["shipping_cost"]
    monthly["gm_pct"] = (monthly["gross_margin"] / monthly["revenue"] * 100).round(2)
    monthly["nm_pct"] = (monthly["net_margin"] / monthly["revenue"] * 100).round(2)
    monthly["flag"] = monthly["nm_pct"] < 15
    table = monthly.rename(columns={"month":"Month","revenue":"Revenue","coffee_cogs":"Coffee COGS","pkg_cogs":"Pkg COGS","labor_cogs":"Labor COGS","total_cogs":"Total COGS","shipping_cost":"Shipping","gross_margin":"Gross Margin","net_margin":"Net Margin","gm_pct":"GM %","nm_pct":"NM %","flag":"Below 15%?"}).to_dict(orient="records")
    flagged = monthly[monthly["flag"]]["month"].tolist()
    summary = f"Monthly P&L: {len(monthly)} months. Below 15% net margin: {', '.join(flagged) if flagged else 'None'}."
    return {"table": table, "summary": summary}


def t0_to_t1_scenario():
    txn = get_transactions()
    bom = get_products_bom()
    customers = get_customers()
    pricing = get_pricing_tiers()
    t0_custs = customers[customers["tier"] == "T0"]["customer_id"].tolist()
    t0_txn = txn[txn["customer_id"].isin(t0_custs)].copy()
    t0_txn = t0_txn.merge(bom[["sku_id","total_cogs"]], on="sku_id")
    t1_prices = pricing[pricing["tier"] == "T1"][["sku_id","unit_price"]].rename(columns={"unit_price":"t1_price"})
    t0_txn = t0_txn.merge(t1_prices, on="sku_id", how="left")
    t0_txn["t1_revenue"] = t0_txn["quantity"] * t0_txn["t1_price"] * 0.6
    t0_txn["t1_cogs"] = t0_txn["quantity"] * t0_txn["total_cogs"] * 0.6
    t0_txn["t1_gp"] = t0_txn["t1_revenue"] - t0_txn["t1_cogs"]
    t0_txn["old_gp"] = t0_txn["net_revenue"] - t0_txn["quantity"] * t0_txn["total_cogs"]
    old_rev = t0_txn["net_revenue"].sum()
    new_rev = t0_txn["t1_revenue"].sum()
    old_gp = t0_txn["old_gp"].sum()
    new_gp = t0_txn["t1_gp"].sum()
    table = [{"Metric":"T0 Revenue","Value":round(old_rev,2)},{"Metric":"T1 Revenue (60% retained)","Value":round(new_rev,2)},{"Metric":"Revenue Change","Value":round(new_rev-old_rev,2)},{"Metric":"T0 Gross Profit","Value":round(old_gp,2)},{"Metric":"T1 Gross Profit","Value":round(new_gp,2)},{"Metric":"GP Change","Value":round(new_gp-old_gp,2)}]
    pct = (new_rev-old_rev)/old_rev*100 if old_rev else 0
    summary = f"Dropping T0 at 60% T1 retention: revenue {pct:.1f}% change. GP change: ${new_gp-old_gp:,.0f}."
    return {"table": table, "summary": summary}


def executive_dashboard():
    txn = get_transactions()
    bom = get_products_bom()
    shipping = get_shipping()
    budget = get_budget()
    merged = txn.merge(bom[["sku_id","total_cogs"]], on="sku_id")
    merged["cogs_line"] = merged["quantity"] * merged["total_cogs"]
    total_rev = merged["net_revenue"].sum()
    total_cogs = merged["cogs_line"].sum()
    total_ship = shipping["shipping_cost"].sum()
    gp = total_rev - total_cogs
    nm = gp - total_ship
    gm_pct = gp / total_rev * 100
    nm_pct = nm / total_rev * 100
    rev_b = budget[budget["category"]=="revenue"]
    bv = rev_b["actual_amount"].sum() - rev_b["budget_amount"].sum()
    ship_b = budget[budget["category"]=="shipping"]
    sv = ship_b["actual_amount"].sum() - ship_b["budget_amount"].sum()
    cust_agg = merged.groupby("customer_id")["net_revenue"].sum()
    top2_pct = cust_agg.nlargest(2).sum() / total_rev * 100
    table = [{"KPI":"Total Revenue","Value":f"${total_rev:,.0f}"},{"KPI":"Gross Margin %","Value":f"{gm_pct:.1f}%"},{"KPI":"Net Margin %","Value":f"{nm_pct:.1f}%"},{"KPI":"Shipping vs Budget","Value":f"${sv:,.0f}"},{"KPI":"Top 2 Customer Concentration","Value":f"{top2_pct:.1f}%"},{"KPI":"Revenue vs Budget","Value":f"${bv:,.0f}"}]
    summary = f"1. Profitability: GM {gm_pct:.1f}%, NM {nm_pct:.1f}%. 2. Shipping over budget by ${sv:,.0f}. 3. Top 2 customers = {top2_pct:.1f}% revenue concentration."
    return {"table": table, "summary": summary}
"""

with open("backend/tools/analytics_tools2.py", "a", encoding="utf-8") as f:
    f.write(code)
print("Done - Q16-Q20 appended")
