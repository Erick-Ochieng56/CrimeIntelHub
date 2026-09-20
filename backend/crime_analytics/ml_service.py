"""
Unified crime prediction ML service.

Single feature schema for train + predict, one model artifact on disk.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from django.conf import settings
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

logger = logging.getLogger(__name__)

FEATURE_COLUMNS = [
    'latitude',
    'longitude',
    'hour',
    'day_of_week',
    'month',
    'crime_density',
    'distance_to_hotspot',
    'district_encoded',
]

MODEL_VERSION = '2.0'


def default_model_path() -> str:
    base = getattr(settings, 'BASE_DIR', os.getcwd())
    models_dir = os.path.join(base, 'ml_models')
    os.makedirs(models_dir, exist_ok=True)
    return os.path.join(models_dir, 'crime_predictor.joblib')


class CrimePredictor:
    """Random-forest crime risk predictor with hotspot-aware features."""

    def __init__(self, model_path: Optional[str] = None, n_hotspots: int = 10):
        self.model_path = model_path or default_model_path()
        self.n_hotspots = n_hotspots
        self.model: Optional[RandomForestClassifier] = None
        self.hotspot_centers: Optional[np.ndarray] = None
        self.feature_columns = list(FEATURE_COLUMNS)
        self.district_categories: List[str] = []

    def _load_crime_frame(self) -> pd.DataFrame:
        from crimes.models import Crime

        rows = []
        qs = (
            Crime.objects.filter(location__isnull=False)
            .select_related('category', 'district')
            .iterator(chunk_size=2000)
        )
        for crime in qs:
            rows.append({
                'latitude': crime.location.y,
                'longitude': crime.location.x,
                'date': crime.date,
                'time': crime.time,
                'is_violent': int(bool(crime.is_violent)),
                'category': crime.category.name if crime.category else 'OTHER',
                'district': crime.district.name if crime.district else 'UNKNOWN',
            })

        df = pd.DataFrame(rows)
        if df.empty:
            return df

        # Temporal features
        times = pd.to_datetime(df['time'].astype(str), format='%H:%M:%S', errors='coerce')
        if times.isna().all():
            times = pd.to_datetime(df['time'].astype(str), errors='coerce')
        dates = pd.to_datetime(df['date'], errors='coerce')
        df['hour'] = times.dt.hour.fillna(12).astype(int)
        df['day_of_week'] = dates.dt.dayofweek.fillna(0).astype(int)
        df['month'] = dates.dt.month.fillna(1).astype(int)
        df = df.dropna(subset=['latitude', 'longitude'])
        return df

    def _encode_districts(self, df: pd.DataFrame, fit: bool = False) -> pd.DataFrame:
        if fit or not self.district_categories:
            cats = sorted(df['district'].fillna('UNKNOWN').unique().tolist())
            self.district_categories = cats or ['UNKNOWN']
        mapping = {name: idx for idx, name in enumerate(self.district_categories)}
        df = df.copy()
        df['district_encoded'] = (
            df['district'].fillna('UNKNOWN').map(mapping).fillna(0).astype(int)
        )
        return df

    def _compute_hotspots(self, df: pd.DataFrame) -> None:
        coords = df[['longitude', 'latitude']].to_numpy(dtype=float)
        n = min(self.n_hotspots, max(1, len(coords)))
        if len(coords) == 1:
            self.hotspot_centers = coords
            return
        kmeans = KMeans(n_clusters=n, random_state=42, n_init=10)
        kmeans.fit(coords)
        self.hotspot_centers = kmeans.cluster_centers_

    def _distance_to_hotspot(self, lon: float, lat: float) -> float:
        if self.hotspot_centers is None or len(self.hotspot_centers) == 0:
            return 0.0
        diffs = self.hotspot_centers - np.array([lon, lat], dtype=float)
        # Approximate km (111 km per degree)
        dist_km = np.sqrt((diffs[:, 0] * 111) ** 2 + (diffs[:, 1] * 111) ** 2)
        return float(dist_km.min())

    def _crime_density(self, df: pd.DataFrame, lon: float, lat: float, radius_km: float = 1.0) -> int:
        if df.empty:
            return 0
        dlon = (df['longitude'] - lon) * 111
        dlat = (df['latitude'] - lat) * 111
        return int(((dlon ** 2 + dlat ** 2) <= radius_km ** 2).sum())

    def _build_feature_row(
        self,
        *,
        lat: float,
        lon: float,
        hour: int,
        day_of_week: int,
        month: int,
        district_encoded: int,
        crime_density: int,
    ) -> Dict[str, float]:
        return {
            'latitude': float(lat),
            'longitude': float(lon),
            'hour': int(hour),
            'day_of_week': int(day_of_week),
            'month': int(month),
            'crime_density': int(crime_density),
            'distance_to_hotspot': self._distance_to_hotspot(lon, lat),
            'district_encoded': int(district_encoded),
        }

    def build_training_matrix(self, df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
        """Positive samples = real crimes; negatives = random non-crime points."""
        df = self._encode_districts(df, fit=True)
        self._compute_hotspots(df)

        positives = []
        for row in df.itertuples(index=False):
            density = self._crime_density(df, row.longitude, row.latitude)
            positives.append(
                self._build_feature_row(
                    lat=row.latitude,
                    lon=row.longitude,
                    hour=row.hour,
                    day_of_week=row.day_of_week,
                    month=row.month,
                    district_encoded=row.district_encoded,
                    crime_density=max(0, density - 1),
                )
            )
        pos_df = pd.DataFrame(positives)
        pos_df['label'] = 1

        # Negative samples outside dense clusters
        min_lon, max_lon = df['longitude'].min(), df['longitude'].max()
        min_lat, max_lat = df['latitude'].min(), df['latitude'].max()
        n_neg = max(len(pos_df), 100)
        negatives = []
        attempts = 0
        mode_district = int(df['district_encoded'].mode().iloc[0]) if len(df) else 0
        while len(negatives) < n_neg and attempts < n_neg * 20:
            attempts += 1
            lon = float(np.random.uniform(min_lon, max_lon))
            lat = float(np.random.uniform(min_lat, max_lat))
            if self._crime_density(df, lon, lat, radius_km=0.3) > 0:
                continue
            negatives.append(
                self._build_feature_row(
                    lat=lat,
                    lon=lon,
                    hour=int(np.random.randint(0, 24)),
                    day_of_week=int(np.random.randint(0, 7)),
                    month=int(np.random.randint(1, 13)),
                    district_encoded=mode_district,
                    crime_density=0,
                )
            )
        neg_df = pd.DataFrame(negatives)
        if not neg_df.empty:
            neg_df['label'] = 0

        train_df = pd.concat([pos_df, neg_df], ignore_index=True)
        X = train_df[self.feature_columns]
        y = train_df['label']
        return X, y

    def train(self) -> Dict[str, Any]:
        df = self._load_crime_frame()
        if df.empty:
            raise ValueError('No crime data with locations available for training')

        X, y = self.build_training_matrix(df)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if y.nunique() > 1 else None
        )

        self.model = RandomForestClassifier(
            n_estimators=120,
            random_state=42,
            class_weight='balanced',
            n_jobs=-1,
        )
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        metrics = {
            'accuracy': float(accuracy_score(y_test, y_pred)),
            'n_train': int(len(X_train)),
            'n_test': int(len(X_test)),
            'n_features': len(self.feature_columns),
            'version': MODEL_VERSION,
        }
        try:
            if hasattr(self.model, 'predict_proba') and y_test.nunique() > 1:
                proba = self.model.predict_proba(X_test)[:, 1]
                metrics['roc_auc'] = float(roc_auc_score(y_test, proba))
        except Exception:
            pass

        self.save()
        return metrics

    def save(self) -> str:
        payload = {
            'version': MODEL_VERSION,
            'model': self.model,
            'hotspot_centers': self.hotspot_centers,
            'feature_columns': self.feature_columns,
            'district_categories': self.district_categories,
            'n_hotspots': self.n_hotspots,
        }
        joblib.dump(payload, self.model_path)
        logger.info('Saved crime predictor to %s', self.model_path)
        return self.model_path

    def load(self) -> bool:
        if not os.path.exists(self.model_path):
            return False
        payload = joblib.load(self.model_path)
        if isinstance(payload, dict) and 'model' in payload:
            self.model = payload['model']
            self.hotspot_centers = payload.get('hotspot_centers')
            self.feature_columns = payload.get('feature_columns', list(FEATURE_COLUMNS))
            self.district_categories = payload.get('district_categories', [])
            self.n_hotspots = payload.get('n_hotspots', self.n_hotspots)
            return True
        # Legacy bare estimator — not usable with current features
        logger.warning('Legacy model format at %s; retrain required', self.model_path)
        return False

    def ensure_ready(self) -> None:
        if self.model is not None:
            return
        if self.load():
            return
        self.train()

    def feature_importance(self) -> List[Dict[str, Any]]:
        if not self.model:
            return []
        return [
            {'feature': col, 'importance': float(imp)}
            for col, imp in zip(self.feature_columns, self.model.feature_importances_)
        ]

    def predict(
        self,
        lat: float,
        lng: float,
        date: str,
        crime_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        self.ensure_ready()
        df = self._load_crime_frame()
        if self.hotspot_centers is None and not df.empty:
            df = self._encode_districts(df, fit=not self.district_categories)
            self._compute_hotspots(df)

        target_dt = datetime.strptime(date, '%Y-%m-%d')
        district_encoded = 0
        if self.district_categories:
            # nearest-district approximation via mode in training set
            if not df.empty:
                df = self._encode_districts(df, fit=False)
                district_encoded = int(df['district_encoded'].mode().iloc[0])

        density = self._crime_density(df, lng, lat) if not df.empty else 0
        violent_hint = 1 if (crime_type or '').upper() in {
            'HOMICIDE', 'ROBBERY', 'VIOLENT', 'ASSAULT'
        } else 0

        time_segments = [
            (0, 'Night'),
            (6, 'Morning'),
            (12, 'Afternoon'),
            (18, 'Evening'),
        ]
        features = []
        for hour, label in time_segments:
            row = self._build_feature_row(
                lat=lat,
                lon=lng,
                hour=hour,
                day_of_week=target_dt.weekday(),
                month=target_dt.month,
                district_encoded=district_encoded,
                crime_density=density + violent_hint,
            )
            features.append({**row, 'time_of_day': label})

        features_df = pd.DataFrame(features)
        X = features_df[self.feature_columns]
        probabilities = self.model.predict_proba(X)[:, 1]
        importance = self.feature_importance()

        geo_features = []
        for idx, prob in enumerate(probabilities):
            geo_features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lng, lat],
                },
                'properties': {
                    'probability': float(prob),
                    'crime_type': crime_type or 'ALL',
                    'radius': 300,
                    'factors': importance[:5],
                    'address': None,
                    'time_of_day': features_df['time_of_day'].iloc[idx],
                    'model_version': MODEL_VERSION,
                },
            })

        return {
            'type': 'FeatureCollection',
            'features': geo_features,
            'model_path': self.model_path,
            'model_version': MODEL_VERSION,
        }
