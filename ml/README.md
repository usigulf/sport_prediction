# ML Pipeline

## Quick Start

### 1. Train a Simple Model

```bash
cd ml/training
python train_simple_model.py
```

This will:
- Generate synthetic training data
- Train a Random Forest model
- Evaluate performance
- Save the model to `models/simple_model.pkl`

### 2. Test Inference

```bash
cd ml/inference
python simple_inference.py
```

This will load the trained model and make a sample prediction.

## Model Files

- `models/simple_model.pkl` - Trained model
- `models/feature_columns.pkl` - Feature column names

## Next Steps

1. **Real Data Integration**: Replace synthetic data with actual game data
2. **Feature Engineering**: Implement the full feature engineering pipeline
3. **Model Training**: Train XGBoost, Neural Networks, and ensemble models
4. **Model Deployment**: Deploy to TensorFlow Serving or similar
5. **Explainability**: Add SHAP/LIME explanations

## Production Models

For production, you'll want to:
- Use real historical game data
- Implement proper feature engineering
- Train multiple models and ensemble them
- Deploy to a model serving infrastructure
- Monitor model performance and retrain regularly

See `ML_PIPELINE.md` for the full architecture.
