"""
Backward-compatible import path for CrimePredictor.

Canonical implementation lives in crime_analytics.ml_service.
"""
from crime_analytics.ml_service import CrimePredictor, default_model_path, FEATURE_COLUMNS

__all__ = ['CrimePredictor', 'default_model_path', 'FEATURE_COLUMNS']
