# Summit Coffee Co. — Supply Chain Analytics Agent

An AI-powered "digital worker" that answers natural language supply chain and profitability questions by joining data across 6 CSV data sources. Built with **Python (FastAPI + Anthropic Claude Agent SDK)** backend and **React** frontend.

> **⚡ Powered by Claude:** This project uses the [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python) (`anthropic`) as the **Claude Agent SDK**. The agent is fully driven by **Claude 3.5 Sonnet** via Anthropic's `client.messages.create()` API with native `tool_use` (function-calling).

---

## Quick Start

### 1. Clone / unzip the project

```bash
cd supply-chain-agent
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file (or edit the existing one):

```env
ANTHROPIC_API_KEY=sk-ant-...your-anthropic-key-here...
CLAUDE_MODEL=claude-3-5-sonnet-20241022
DATA_DIR=./data
```

> Get your Anthropic API key at: https://console.anthropic.com/

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at: http://localhost:3000

---

## Architecture Overview

```
supply-chain-agent/
├── backend/
│   ├── main.py              # FastAPI app, REST endpoints
│   ├── agent.py             # Core agent: plan → execute → narrate (Claude SDK)
│   ├── tool_registry.py     # Registry of analytics tools
│   ├── data_loader.py       # CSV loading with caching
│   ├── tools/
│   │   └── generic_tool.py  # Generic pandas code executor
│   └── data/                # 6 CSV data files
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app shell
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx   # Question input + history
│   │   │   ├── ResultPanel.jsx     # Narrative + table display
│   │   │   ├── DataTable.jsx       # Sortable results table
│   │   │   └── SampleQuestions.jsx # 20 pre-built questions
│   │   └── api.js           # Axios API client
│   └── package.json
└── README.md
```

### How the Agent Works (Claude Agent SDK)

```
User Question
     │
     ▼
[1] PLAN — Claude (claude-3-5-sonnet) uses tool_use to generate pandas code
     │      via anthropic client.messages.create() with tool_choice forced
     ▼
[2] EXECUTE — Python runs the Claude-generated pandas code against CSV data
     │         If error → Claude self-corrects via multi-turn tool_result loop
     ▼
[3] NARRATE — Claude generates a 3-5 paragraph narrative analysis
     │         from the structured data output
     ▼
[4] RESPOND — FastAPI returns {table, summary, narrative, trace, tokens}
     │
     ▼
React Frontend displays narrative + sortable table + trace log
```

### Claude Agent SDK Integration

The agent uses the **Anthropic Python SDK** (`anthropic>=0.25.0`) as the Claude Agent SDK:

| Feature | Implementation |
|---|---|
| **LLM Client** | `anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)` |
| **Model** | `claude-3-5-sonnet-20241022` (configurable via `CLAUDE_MODEL`) |
| **Tool Calling** | `tool_choice={"type": "tool", "name": "run_analytics_query"}` |
| **Tool Schema** | `input_schema` (JSON Schema, Anthropic format) |
| **Response Parsing** | `block.type == "tool_use"` content blocks |
| **Self-Correction** | Multi-turn `tool_result` messages for error recovery |
| **Narrative** | Second `client.messages.create()` call for analysis |

### Planning Flow (Tool Selection)

The agent uses **Claude's native `tool_use`** to generate analytics code. The single tool `run_analytics_query` accepts Python/pandas code that Claude writes on-the-fly. If the generated code raises an error, the agent sends the error back to Claude as a `tool_result` message and Claude self-corrects — no hardcoded fallback needed.

### Data Joins

Each analytics query explicitly joins the required data sources using pandas:

| Question Type | Data Sources Joined |
|---|---|
| SKU Profitability | transactions + products_bom |
| Customer Margin | transactions + products_bom + shipping + customers |
| Pricing Anomalies | transactions + customers + pricing_tiers |
| Budget Tracking | budget + transactions + shipping |
| Scenarios | transactions + products_bom + customers + pricing_tiers |

Data is loaded once and cached in memory via `functools.lru_cache`.

---

## The 20 Questions

| ID | Category | Question |
|---|---|---|
| Q1 | SKU Profitability | Top/bottom 10 SKUs by realized gross margin % |
| Q2 | SKU Profitability | Ethiopian Yirgacheffe tier vs actual margin |
| Q3 | SKU Profitability | MSRP vs actual price gap by SKU |
| Q4 | SKU Profitability | Pricing tier anomalies in transactions |
| Q5 | Customer | Top 5 customers by fully-loaded margin |
| Q6 | Customer | Coastal Cafe Group full profitability breakdown |
| Q7 | Customer | Customer concentration risk |
| Q8 | Customer | Channel profitability comparison |
| Q9 | Shipping | Expedited shipping % by month |
| Q10 | Shipping | Shipping cost as % of order value by customer |
| Q11 | Shipping | Savings from converting expedited to standard |
| Q12 | Shipping | Carrier comparison (UPS/FedEx/USPS) by cost/lb |
| Q13 | Budget | Plan vs actual all categories |
| Q14 | Budget | Shipping budget overrun root cause |
| Q15 | Budget | Revenue budget tracking |
| Q16 | Strategic | Brazil tariff 50% impact model |
| Q17 | Strategic | Account manager portfolio performance |
| Q18 | Strategic | Monthly P&L (6 months) |
| Q19 | Strategic | T0→T1 pricing scenario (60% retention) |
| Q20 | Strategic | Executive dashboard summary |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/health` | Data source row counts |
| GET | `/tools` | List all analytics tools |
| POST | `/ask` | Submit a question, get analysis |
| GET | `/sample-questions` | Return all 20 sample questions |

### POST /ask

**Request:**
```json
{ "question": "What are our top 10 SKUs by gross margin?" }
```

**Response:**
```json
{
  "tool_name": "run_analytics_query",
  "table": [...],
  "summary": "Top SKU: ...",
  "narrative": "## Analysis\n...",
  "trace": ["Planning: asking Claude to generate analytics code...", "Claude generated code (412 chars)", ...],
  "tokens_used": 1842,
  "latency_ms": 2100
}
```

---

## Scaling to 15-20 Live API Sources

1. **Tool Registry as Config**: Each data source becomes a registered connector (REST API, database, webhook). The tool registry pattern already supports this — swap `pd.read_csv()` for API calls.
2. **Async Data Loading**: Use `asyncio` + `httpx` for parallel API calls across sources.
3. **Caching Layer**: Redis cache with TTL per data source (e.g., 5 min for transactions, 1 hr for BOM).
4. **Schema Registry**: Each source registers its schema so Claude can plan joins dynamically.
5. **Connection Pooling**: SQLAlchemy for databases, connection pools for APIs.

## Adding RBAC (Role-Based Access Control)

1. **JWT Authentication**: FastAPI middleware validates Bearer tokens.
2. **Role Definitions**: `analyst`, `manager`, `executive`, `admin`.
3. **Tool-Level Permissions**: Each tool in the registry gets a `required_roles` list.
4. **Data Filtering**: Customer-level data filtered by account_manager for non-admin roles.
5. **Audit Logging**: Every `/ask` call logged with user_id, tool_name, timestamp.

## Making Queries Reusable ("Skills")

1. **Skill Store**: SQLite/Postgres table: `(skill_id, name, question_template, tool_name, parameters, created_by, upvotes)`.
2. **Upvote Endpoint**: `POST /skills/{id}/upvote` — promotes a query pattern.
3. **Skill Execution**: `POST /skills/{id}/run` — runs saved query with optional parameter overrides.
4. **Template Variables**: Questions support `{customer_name}`, `{month}` placeholders.
5. **Skill Discovery**: `GET /skills?category=shipping` — browse reusable analyses.

---

## Known Limitations & Future Improvements

### Current Limitations
- **Static data**: CSVs are loaded at startup. Production would use live API connectors.
- **Single tool per question**: Agent calls one tool per question. Complex multi-step questions may need chaining.
- **No authentication**: API is open. Production needs JWT/OAuth.
- **No persistent history**: Conversation history is client-side only.

### With More Time
- **Multi-tool chaining**: Claude could call multiple tools and synthesize results.
- **Streaming responses**: Stream Claude's narrative tokens to frontend for faster perceived response.
- **Skill saving**: Upvote/save successful queries as reusable templates.
- **Chart generation**: Auto-generate matplotlib/plotly charts for time-series data.
- **Data validation**: Automated data quality checks on CSV load (missing values, outliers).
- **Vector search**: Embed tool descriptions for semantic tool selection.
- **Cost tracking dashboard**: Track Anthropic token costs per question/user/day.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **LLM** | **Anthropic Claude 3.5 Sonnet** | **State-of-the-art reasoning, native tool_use, Claude Agent SDK** |
| Backend | FastAPI + Python | Fast, async, auto-docs, type-safe |
| Data | Pandas | Flexible joins/aggregations on CSV data |
| Frontend | React + Axios | Component-based, fast iteration |
| Styling | Tailwind CSS | Utility-first, consistent design |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key (get at console.anthropic.com) |
| `CLAUDE_MODEL` | No | `claude-3-5-sonnet-20241022` | Claude model to use |
| `DATA_DIR` | No | `./data` | Path to CSV data files |
