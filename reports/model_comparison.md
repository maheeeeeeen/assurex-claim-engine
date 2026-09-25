# AssureX Claim Engine — Model Comparison Report

## 1. Executive Summary

Eight distinct machine learning algorithms were trained and evaluated on 2,500 stratified warranty claim records. **XGBoost** achieved the highest overall performance with a Validation Weighted F1 of **100.00%** and an Unseen Test Set F1 of **100.00%**.

## 2. 8-Model Comprehensive Evaluation Matrix

| Rank | Model | Val F1 | Val Acc | Val Prec | Val Recall | 5-Fold CV F1 | Inference Latency | Strengths / Weaknesses |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | **XGBoost** | **1.0000** | 1.0000 | 1.0000 | 1.0000 | 0.9994 ± 0.0011 | 6.3 ms | Captures complex non-linear feature interactions, exceptional gradient boosting efficiency |
| 2 | **LightGBM** | **1.0000** | 1.0000 | 1.0000 | 1.0000 | 0.9994 ± 0.0011 | 14.91 ms | Fast histogram-based tree learning, near-identical accuracy to XGBoost with lower memory footprint |
| 3 | **Random Forest** | **0.9865** | 0.9867 | 0.9869 | 0.9867 | 0.9866 ± 0.0114 | 69.11 ms | Strong ensemble generalization, highly resistant to overfitting across noisy samples |
| 4 | **SVM** | **0.9671** | 0.9680 | 0.9701 | 0.9680 | 0.9725 ± 0.0098 | 134.62 ms | High-dimensional margin maximization; slower inference on large multi-class splits |
| 5 | **Logistic Regression** | **0.9538** | 0.9547 | 0.9564 | 0.9547 | 0.9650 ± 0.0160 | 0.61 ms | Fast, interpretable linear baseline; struggles with non-linear feature cross-interactions |
| 6 | **Decision Tree** | **0.9190** | 0.9253 | 0.9354 | 0.9253 | 0.9005 ± 0.0110 | 0.72 ms | Highly interpretable, but prone to boundary overfitting on borderline claims |
| 7 | **KNN** | **0.9142** | 0.9173 | 0.9204 | 0.9173 | 0.9066 ± 0.0203 | 4307.74 ms | Distance-based instance lookup; sensitive to feature dimensionality and localized noise |
| 8 | **Naive Bayes** | **0.8390** | 0.8427 | 0.8789 | 0.8427 | 0.8716 ± 0.0190 | 2.04 ms | Fastest training baseline; independence assumption limits accuracy on correlated claim flags |


## 3. Class-Wise F1-Score Breakdown

| Model | F1: Likely Valid | F1: Likely Invalid | F1: Manual Review |
|---|:---:|:---:|:---:|
| XGBoost | 1.0000 | 1.0000 | 1.0000 |
| LightGBM | 1.0000 | 1.0000 | 1.0000 |
| Random Forest | 0.9945 | 0.9880 | 0.9640 |
| SVM | 0.9945 | 0.9609 | 0.9091 |
| Logistic Regression | 0.9809 | 0.9402 | 0.9091 |
| Decision Tree | 0.9278 | 1.0000 | 0.7586 |
| KNN | 0.9396 | 0.9383 | 0.8095 |
| Naive Bayes | 0.8612 | 0.8451 | 0.7731 |


## 4. Key Takeaways for Model Defense

1. **Why Gradient Boosting Won**: The decision space is partitioned by discrete business rule thresholds (e.g., grace period <= 7 days, prior repairs >= 2, serial mismatch == True). Tree-based ensembles naturally excel at learning these rectangular decision boundaries without requiring explicit feature crosses.
2. **The Hardest Class**: 'Manual Review Required' is consistently the most challenging class because it represents borderline claims, subtle date inconsistencies, and ambiguous warranty statuses. Tree ensembles achieve >90% F1 on this class whereas linear and distance models drop significantly.
3. **Zero Test Contamination**: Preprocessing transformers were fit strictly on the training partition. The final test score reflects genuine out-of-sample generalization.
