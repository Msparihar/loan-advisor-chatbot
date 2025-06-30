# train_model.py
import pandas as pd
import numpy as np
import json
import joblib
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

print("Starting model training process...")

# --- 1. Load Lender Data ---
with open("data/lenders.json", "r") as f:
    lenders = pd.DataFrame(json.load(f))

print(f"Loaded {len(lenders)} lenders.")

# --- 2. Generate Synthetic Applicant Data ---
num_applicants = 5000
applicant_data = {
    "loan_amount": np.random.randint(500, 1000000, num_applicants),
    "annual_income": np.random.randint(15000, 200000, num_applicants),
    "credit_score": np.random.randint(500, 850, num_applicants),
    "employment_status": np.random.choice(["salaried", "self-employed", "freelancer", "student"], num_applicants),
    "loan_purpose": np.random.choice(["home", "education", "business", "vehicle", "emergency"], num_applicants),
}
applicants = pd.DataFrame(applicant_data)

print(f"Generated {num_applicants} synthetic applicants.")

# --- 3. Create Training Dataset and Labels ---
dataset = applicants.assign(key=1).merge(lenders.assign(key=1), on="key").drop("key", axis=1)


def is_a_good_match(row):
    if not (row["minLoanAmount"] <= row["loan_amount"] <= row["maxLoanAmount"]):
        return 0
    if row["annual_income"] < row["minIncome"]:
        return 0
    if row["credit_score"] < row["minCreditScore"]:
        return 0
    if "any" not in row["employmentTypes"] and row["employment_status"] not in row["employmentTypes"]:
        return 0
    if pd.notna(row["loanPurpose"]) and row["loanPurpose"] != row["loan_purpose"]:
        return 0
    return 1


dataset["is_match"] = dataset.apply(is_a_good_match, axis=1)
print(f"Created training dataset with {len(dataset)} examples.")
print(f"Match distribution:\n{dataset['is_match'].value_counts(normalize=True)}")


# --- 4. Feature Engineering ---

# ####################################################################
# ################          THIS IS THE FIX          #################
# We drop the lender's categorical columns as their logic is already
# handled in the 'is_a_good_match' function. We also add `errors='ignore'`
# to prevent crashes if a column doesn't exist.
# ####################################################################
features = dataset.drop(
    ["is_match", "name", "employmentTypes", "id", "loanPurpose", "specialEligibility"], axis=1, errors="ignore"
)
labels = dataset["is_match"]

# One-hot encode the remaining categorical variables (from the applicant)
features_encoded = pd.get_dummies(features, columns=["employment_status", "loan_purpose"], dummy_na=True)

# Store the columns used for training to ensure consistency during inference
training_columns = features_encoded.columns.tolist()
with open("trained_model/training_columns.json", "w") as f:
    json.dump(training_columns, f)

print("Features encoded. Total features:", len(training_columns))

# --- 5. Train the Model ---
X_train, X_test, y_train, y_test = train_test_split(
    features_encoded, labels, test_size=0.2, random_state=42, stratify=labels
)

# Using a Decision Tree Classifier - simple and effective
model = DecisionTreeClassifier(max_depth=10, random_state=42, class_weight="balanced")
model.fit(X_train, y_train)

print("Model training complete.")

# --- 6. Evaluate and Save the Model ---
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy on Test Set: {accuracy:.4f}")

joblib.dump(model, "trained_model/loan_predictor_model.joblib")

print("Model and training columns saved to 'trained_model/' directory.")
