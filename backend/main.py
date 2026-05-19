"""
FastAPI Backend for Supply Chain Analytics Agent
"""
import os
import sys
import logging
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent import plan_and_execute
from tool_registry import get_tool_descriptions
from data_loader import get_all_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Summit Coffee Co. Supply Chain Analytics Agent",
    description="AI-powered supply chain analytics agent",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    question: str


class AnalyticsResponse(BaseModel):
    tool_name: Optional[str]
    table: List[Dict[str, Any]]
    summary: str
    narrative: str
    trace: List[str]
    tokens_used: int
    latency_ms: int
    extra_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@app.get("/")
def root():
    return {"status": "ok", "service": "Summit Coffee Co. Analytics Agent"}


@app.get("/health")
def health():
    try:
        data = get_all_data()
        return {
            "status": "healthy",
            "data_sources": {k: len(v) for k, v in data.items()},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tools")
def list_tools():
    """List available analytics tools."""
    return {"tools": get_tool_descriptions()}


@app.post("/ask", response_model=AnalyticsResponse)
def ask(request: QuestionRequest):
    """Main endpoint: accepts a natural language question and returns analysis."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    logger.info(f"Question: {request.question}")
    result = plan_and_execute(request.question)
    return AnalyticsResponse(**result)


@app.get("/sample-questions")
def sample_questions():
    """Return the 20 sample questions."""
    return {
        "questions": [
            {"id": "Q1",  "text": "What are our top 10 and bottom 10 SKUs by actual realized gross margin percentage?"},
            {"id": "Q2",  "text": "For Ethiopian Yirgacheffe 12oz, show me the theoretical margin at every pricing tier, then compare it to the actual blended margin we've realized in transactions."},
            {"id": "Q3",  "text": "Which SKUs have the highest gap between their MSRP and the average price we actually sell them at?"},
            {"id": "Q4",  "text": "Identify any transactions where a customer was charged a price that doesn't match their assigned pricing tier."},
            {"id": "Q5",  "text": "Who are our top 5 customers by total revenue, and what is their fully-loaded margin after COGS and shipping?"},
            {"id": "Q6",  "text": "Give me a full profitability breakdown for Coastal Cafe Group - revenue, COGS, shipping cost, and net margin broken down by SKU."},
            {"id": "Q7",  "text": "What is our customer concentration risk? Show cumulative revenue percentage by customer."},
            {"id": "Q8",  "text": "Compare the profitability of our wholesale channel vs. Shopify DTC vs. Amazon. Which channel should we invest in?"},
            {"id": "Q9",  "text": "What percentage of our total shipping spend goes to expedited and overnight shipping, broken down by month?"},
            {"id": "Q10", "text": "Which customers have the highest shipping cost as a percentage of their order value?"},
            {"id": "Q11", "text": "If we converted all expedited shipments to standard shipping rates, what would our annual savings be?"},
            {"id": "Q12", "text": "Compare UPS, FedEx, and USPS on cost per pound by service type. Which carrier should we consolidate to?"},
            {"id": "Q13", "text": "Show me plan vs. actual for every cost category for the last 6 months."},
            {"id": "Q14", "text": "What is the root cause of our shipping budget overrun?"},
            {"id": "Q15", "text": "Are we on track to hit our revenue budget for the full 6-month period?"},
            {"id": "Q16", "text": "What would happen to our overall profitability if the cost of Brazilian coffee increased by 50% due to tariffs?"},
            {"id": "Q17", "text": "Which account manager's portfolio has the best and worst blended margin?"},
            {"id": "Q18", "text": "Build me a monthly P&L that shows Revenue, COGS, Gross Margin, Shipping Cost, Net Margin for each of the 6 months."},
            {"id": "Q19", "text": "We're considering dropping all T0 customers and moving that volume to T1 pricing. Model the revenue and margin impact assuming we retain 60% of the volume."},
            {"id": "Q20", "text": "Give me an executive dashboard summary: What are the 3 most important things leadership should know about our business performance?"},
        ]
    }
