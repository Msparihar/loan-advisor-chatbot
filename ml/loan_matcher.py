# loan_matcher.py
import json
import joblib
import pandas as pd
from typing import List, Dict, Any
from models import LoanApplicationRequest, LoanMatchResponse, LenderSuggestion

class LoanMatcher:
    """Handles the logic of matching a loan application to lenders using a trained ML model."""

    def __init__(self, lenders_data_path: str, model_path: str, columns_path: str):
        """Loads lenders, the trained model, and training columns."""
        with open(lenders_data_path, 'r') as f:
            self.lenders: pd.DataFrame = pd.DataFrame(json.load(f))

        self.model = joblib.load(model_path)

        with open(columns_path, 'r') as f:
            self.training_columns: List[str] = json.load(f)

    def find_best_lenders(self, application: LoanApplicationRequest) -> LoanMatchResponse:
        """
        Ranks lenders for a given application using the ML model to predict match probability.
        """
        # 1. Prepare applicant data in a DataFrame
        applicant_df = pd.DataFrame([application.dict()])

        # 2. Create a feature set for each lender combined with the applicant's data
        lender_scores = []
        for index, lender in self.lenders.iterrows():
            lender_series = lender.to_frame().T

            # Create a single row for prediction by merging applicant and lender data
            # `cross` join of single-row dataframes
            prediction_df = applicant_df.assign(key=1).merge(lender_series.assign(key=1), on='key').drop('key', axis=1)

            # 3. Preprocess the data to match the training format
            # One-hot encode categorical features
            processed_df = pd.get_dummies(prediction_df, columns=['employment_status', 'loan_purpose'], dummy_na=True)

            # Ensure the columns match the training set exactly
            # Reindex will add missing columns (with value 0) and remove extra ones.
            processed_df = processed_df.reindex(columns=self.training_columns, fill_value=0)

            # 4. Predict the probability of a "good match"
            # We want the probability of the positive class (1)
            match_probability = self.model.predict_proba(processed_df)[0][1]

            lender_scores.append({
                "name": lender["name"],
                "interest_rate": lender["interestRate"],
                "score": match_probability
            })

        # 5. Sort lenders by the predicted score (descending)
        sorted_lenders = sorted(lender_scores, key=lambda x: x['score'], reverse=True)

        # 6. Get top 3 and format the response
        top_3 = sorted_lenders[:3]

        suggestions = []
        for lender_data in top_3:
            suggestions.append(LenderSuggestion(
                name=lender_data['name'],
                interest_rate=lender_data['interest_rate'],
                reason=f"High match score based on your profile. Offers a competitive rate of {lender_data['interest_rate']}%."
            ))

        # Overall match score can be the score of the top lender, scaled to 0-100
        overall_score = int(top_3[0]['score'] * 100) if top_3 else 0

        return LoanMatchResponse(match_score=overall_score, top_lenders=suggestions)

# Create a single instance to be used by the API
loan_matcher = LoanMatcher(
    lenders_data_path="data/lenders.json",
    model_path="trained_model/loan_predictor_model.joblib",
    columns_path="trained_model/training_columns.json"
)
