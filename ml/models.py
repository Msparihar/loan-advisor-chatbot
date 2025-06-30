# models.py
from pydantic import BaseModel
from typing import List, Optional

# --- Request Models ---


class LoanApplicationRequest(BaseModel):
    """Defines the shape of the data coming from the user's chat input."""

    loan_amount: int
    annual_income: int
    employment_status: str
    credit_score: Optional[int] = None  # User might not know their score
    loan_purpose: str


# --- Response Models ---


class LenderSuggestion(BaseModel):
    """Defines the shape of a single lender suggestion in the response."""

    name: str
    interest_rate: float
    reason: str


class LoanMatchResponse(BaseModel):
    """Defines the final response sent back to the frontend."""

    match_score: int
    top_lenders: List[LenderSuggestion]
