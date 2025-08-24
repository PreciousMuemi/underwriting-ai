import argparse
import json
import os
from datetime import datetime
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, roc_auc_score, average_precision_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier, XGBRegressor


def infer_columns(df: pd.DataFrame) -> Tuple[List[str], Optional[str], Optional[str]]:
    """
    Best-effort inference of feature, regression target, and classification target columns.
    - Returns (feature_columns, price_target, eligibility_target)
    """
    cols = [c.lower() for c in df.columns]

    # Common label names for price/premium
    price_candidates = [
        'premium', 'price', 'annual_premium', 'policy_premium', 'quoted_premium', 'quote'
    ]
    price_target = next((c for c in df.columns if c.lower() in price_candidates), None)

    # Common label names for eligibility/bind/issue outcome
    elig_candidates = [
        'bound', 'issued', 'bind', 'issue', 'converted', 'purchase', 'bought', 'is_bound', 'is_issued'
    ]
    eligibility_target = None
    for c in df.columns:
        cl = c.lower()
        if cl in elig_candidates or ('bind' in cl) or ('issue' in cl) or ('convert' in cl):
            eligibility_target = c
            break

    # Candidate non-feature columns to exclude
    exclude_substrings = [
        'id', 'label', 'target', 'premium', 'price', 'quote', 'bound', 'issued', 'convert'
    ]
    feature_cols = []
    for c in df.columns:
        cl = c.lower()
        if any(tok in cl for tok in exclude_substrings):
            # keep if it's obviously a feature like 'car_age'
            if cl not in ['car_age']:
                continue
        feature_cols.append(c)

    # Ensure targets removed
    feature_cols = [c for c in feature_cols if c != price_target and c != eligibility_target]

    return feature_cols, price_target, eligibility_target


def load_and_merge(car_path: str, chat_path: Optional[str]) -> pd.DataFrame:
    df_car = pd.read_csv(car_path)
    if chat_path and os.path.exists(chat_path):
        df_chat = pd.read_csv(chat_path)
        # Try a safe merge; otherwise concatenate columns side-by-side
        join_keys = [k for k in ['id', 'ID', 'user_id', 'quote_id', 'session_id'] if k in df_car.columns and k in df_chat.columns]
        if join_keys:
            df = pd.merge(df_car, df_chat, on=join_keys[0], how='left')
        else:
            # side-by-side with index alignment
            df = pd.concat([df_car.reset_index(drop=True), df_chat.reset_index(drop=True)], axis=1)
    else:
        df = df_car
    return df


def build_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
    numeric_cols = [c for c in X.columns if np.issubdtype(X[c].dtype, np.number)]
    categorical_cols = [c for c in X.columns if c not in numeric_cols]

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', 'passthrough', numeric_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols),
        ]
    )
    return preprocessor


def train_regressor(X: pd.DataFrame, y: pd.Series) -> Tuple[Pipeline, dict]:
    pre = build_preprocessor(X)
    model = XGBRegressor(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        n_jobs=4,
    )
    pipe = Pipeline([
        ('prep', pre),
        ('model', model)
    ])

    X_train, X_valid, y_train, y_valid = train_test_split(X, y, test_size=0.2, random_state=42)
    pipe.fit(X_train, y_train)

    pred = pipe.predict(X_valid)
    metrics = {
        'mae': float(mean_absolute_error(y_valid, pred)),
        'rmse': float(mean_squared_error(y_valid, pred, squared=False)),
        'r2': float(r2_score(y_valid, pred)),
    }
    return pipe, metrics


def train_classifier(X: pd.DataFrame, y: pd.Series) -> Tuple[Pipeline, dict]:
    # Ensure binary labels 0/1
    y_bin = y.copy()
    if y_bin.dtype != int and y_bin.dtype != bool and y_bin.dtype != float:
        y_bin = y_bin.astype(str).str.lower().map({'1': 1, '0': 0, 'true': 1, 'false': 0, 'yes': 1, 'no': 0})
    y_bin = y_bin.fillna(0).astype(int)

    pre = build_preprocessor(X)
    model = XGBClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        n_jobs=4,
        eval_metric='logloss',
    )
    pipe = Pipeline([
        ('prep', pre),
        ('model', model)
    ])

    X_train, X_valid, y_train, y_valid = train_test_split(X, y_bin, test_size=0.2, random_state=42, stratify=y_bin if y_bin.nunique() == 2 else None)
    pipe.fit(X_train, y_train)

    prob = pipe.predict_proba(X_valid)[:, 1]
    pred = (prob >= 0.5).astype(int)
    metrics = {
        'roc_auc': float(roc_auc_score(y_valid, prob)) if y_valid.nunique() == 2 else None,
        'pr_auc': float(average_precision_score(y_valid, prob)) if y_valid.nunique() == 2 else None,
        'f1': float(f1_score(y_valid, pred)) if y_valid.nunique() == 2 else None,
    }
    return pipe, metrics


def save_artifacts(out_dir: str, name: str, pipe: Pipeline, metrics: dict, feature_cols: List[str]):
    import joblib
    os.makedirs(out_dir, exist_ok=True)
    model_path = os.path.join(out_dir, f'{name}.pkl')
    joblib.dump(pipe, model_path)

    meta = {
        'model': name,
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'metrics': metrics,
        'feature_columns': feature_cols,
        'sklearn_version': '1.7.1',
        'xgboost_version': '3.0.2',
    }
    with open(os.path.join(out_dir, f'{name}.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description='Train pricing and eligibility models for car insurance policy-making')
    parser.add_argument('--car', type=str, default=os.path.join('data', 'car_insurance_claim.csv'))
    parser.add_argument('--chat', type=str, default=os.path.join('data', 'chatbot_simulated_data.csv'))
    parser.add_argument('--out', type=str, default=os.path.join('models'))
    parser.add_argument('--price_target', type=str, default=None, help='Column name to use as premium/price target')
    parser.add_argument('--eligibility_target', type=str, default=None, help='Column name for eligibility/bind outcome (0/1)')
    parser.add_argument('--drop', type=str, nargs='*', default=None, help='Extra columns to drop from features')
    args = parser.parse_args()

    print(f'Loading data from {args.car} and {args.chat}...')
    df = load_and_merge(args.car, args.chat)
    print(f'Dataset shape: {df.shape}')

    # Drop obviously useless columns if user provided
    if args.drop:
        for c in args.drop:
            if c in df.columns:
                df = df.drop(columns=[c])

    feat_cols, inferred_price, inferred_elig = infer_columns(df)
    price_target = args.price_target or inferred_price
    eligibility_target = args.eligibility_target or inferred_elig

    print(f'Inferred feature columns: {len(feat_cols)}')
    print(f'Price target: {price_target}')
    print(f'Eligibility target: {eligibility_target}')

    # Basic NA handling
    df = df.copy()
    for c in feat_cols:
        if df[c].dtype.kind in 'biufc':
            df[c] = df[c].fillna(df[c].median())
        else:
            df[c] = df[c].fillna('unknown')

    # Train pricing model if target available
    if price_target and price_target in df.columns:
        y_price = df[price_target].astype(float)
        X = df[feat_cols]
        reg_pipe, reg_metrics = train_regressor(X, y_price)
        save_artifacts(args.out, 'pricing_xgb', reg_pipe, reg_metrics, feat_cols)
        print('[pricing] Saved model and metrics:', reg_metrics)
    else:
        print('[pricing] Skipped: no price target column found')

    # Train eligibility model if target available
    if eligibility_target and eligibility_target in df.columns:
        y_elig = df[eligibility_target]
        X = df[feat_cols]
        cls_pipe, cls_metrics = train_classifier(X, y_elig)
        save_artifacts(args.out, 'eligibility_xgb', cls_pipe, cls_metrics, feat_cols)
        print('[eligibility] Saved model and metrics:', cls_metrics)
    else:
        print('[eligibility] Skipped: no eligibility target column found')

    print('Done.')


if __name__ == '__main__':
    main()
