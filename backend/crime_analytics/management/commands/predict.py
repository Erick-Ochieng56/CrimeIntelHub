import pandas as pd
import geopandas as gpd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from datetime import datetime
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from crimes.models import Crime, CrimeCategory
import joblib
from shapely.geometry import Point as ShapelyPoint
import os

class CrimePredictor:
    def __init__(self, model_path='crime_predictor_model.joblib', n_hotspots=10):
        self.model_path = model_path
        self.n_hotspots = n_hotspots
        self.model = None
        self.hotspot_centers = None
        self.feature_columns = [
            'distance_to_hotspot', 'crime_density', 'hour', 'day_of_week', 
            'month', 'is_violent', 'district_encoded'
        ]

    def preprocess_data(self):
        """Fetch and preprocess historical crime data."""
        # Fetch crimes
        crimes = Crime.objects.all().values(
            'id', 'location', 'category__name', 'date', 'time', 
            'is_violent', 'district__name'
        )
        df = pd.DataFrame(list(crimes))

        # Extract coordinates
        df['latitude'] = df['location'].apply(lambda p: p.y if p else None)
        df['longitude'] = df['location'].apply(lambda p: p.x if p else None)
        df = df.dropna(subset=['latitude', 'longitude', 'date'])

        # Extract temporal features
        df['datetime'] = pd.to_datetime(df['date'].astype(str) + ' ' + df['time'].astype(str))
        df['hour'] = df['datetime'].dt.hour
        df['day_of_week'] = df['datetime'].dt.dayofweek
        df['month'] = df['datetime'].dt.month

        # Encode categorical features
        df['category'] = df['category__name'].fillna('OTHER')
        df['is_violent'] = df['is_violent'].astype(int)
        df['district'] = df['district__name'].fillna('UNKNOWN')
        df['district_encoded'] = pd.Categorical(df['district']).codes

        # Create GeoDataFrame
        geometry = [ShapelyPoint(lon, lat) for lon, lat in zip(df['longitude'], df['latitude'])]
        gdf = gpd.GeoDataFrame(df, geometry=geometry, crs='EPSG:4326')

        return gdf

    def compute_hotspots(self, gdf):
        """Identify crime hotspots using K-Means clustering."""
        coords = np.array([[p.x, p.y] for p in gdf.geometry])
        if len(coords) < self.n_hotspots:
            self.n_hotspots = max(1, len(coords))
        kmeans = KMeans(n_clusters=self.n_hotspots, random_state=42)
        kmeans.fit(coords)
        self.hotspot_centers = kmeans.cluster_centers_  # [lon, lat]

    def extract_features(self, gdf, target_point=None, target_datetime=None, crime_type=None):
        """Extract features for training or prediction."""
        features = []

        if target_point is None:
            # Training mode: use crime locations
            for idx, row in gdf.iterrows():
                point = row.geometry
                # Compute distance to nearest hotspot
                distances = [
                    point.distance(ShapelyPoint(lon, lat))
                    for lon, lat in self.hotspot_centers
                ]
                distance_to_hotspot = min(distances) if distances else 0

                # Compute crime density (crimes within 1km)
                crime_density = len(gdf[gdf.geometry.distance(point) * 111 <= 1])

                feature = {
                    'distance_to_hotspot': distance_to_hotspot,
                    'crime_density': crime_density,
                    'hour': row['hour'],
                    'day_of_week': row['day_of_week'],
                    'month': row['month'],
                    'is_violent': row['is_violent'],
                    'district_encoded': row['district_encoded'],
                    'label': 1 if crime_type is None or row['category'] == crime_type else 0
                }
                features.append(feature)
        else:
            # Prediction mode: use target point and time segments
            target_gdf = gpd.GeoDataFrame(
                geometry=[target_point], crs='EPSG:4326'
            )
            distances = [
                target_point.distance(ShapelyPoint(lon, lat))
                for lon, lat in self.hotspot_centers
            ]
            distance_to_hotspot = min(distances) if distances else 0
            crime_density = len(gdf[gdf.geometry.distance(target_point) * 111 <= 1])

            # Generate features for each time-of-day segment
            time_segments = [
                (0, 'Night'), (6, 'Morning'), (12, 'Afternoon'), (18, 'Evening')
            ]
            for hour, time_of_day in time_segments:
                feature = {
                    'distance_to_hotspot': distance_to_hotspot,
                    'crime_density': crime_density,
                    'hour': hour,
                    'day_of_week': target_datetime.weekday(),
                    'month': target_datetime.month,
                    'is_violent': 1 if crime_type in ['HOMICIDE', 'ROBBERY', 'VIOLENT'] else 0,
                    'district_encoded': gdf['district_encoded'].mode().iloc[0] if not gdf.empty else 0,
                    'time_of_day': time_of_day
                }
                features.append(feature)

        return pd.DataFrame(features)

    def generate_negative_samples(self, gdf, n_samples=1000):
        """Generate negative samples (non-crime points)."""
        minx, miny, maxx, maxy = gdf.total_bounds
        negative_points = []
        for _ in range(n_samples):
            lon = np.random.uniform(minx, maxx)
            lat = np.random.uniform(miny, maxy)
            point = ShapelyPoint(lon, lat)
            # Ensure point is not too close to real crimes
            if all(point.distance(p) * 111 > 0.1 for p in gdf.geometry):
                negative_points.append({
                    'geometry': point,
                    'hour': np.random.randint(0, 24),
                    'day_of_week': np.random.randint(0, 7),
                    'month': np.random.randint(1, 13),
                    'is_violent': 0,
                    'district_encoded': gdf['district_encoded'].mode().iloc[0] if not gdf.empty else 0,
                    'category': 'NONE'
                })
        negative_gdf = gpd.GeoDataFrame(negative_points, crs='EPSG:4326')
        return negative_gdf

    def train(self):
        """Train the Random Forest model."""
        gdf = self.preprocess_data()
        if gdf.empty:
            raise ValueError("No crime data available for training")

        self.compute_hotspots(gdf)
        features_df = self.extract_features(gdf)

        # Generate negative samples
        negative_gdf = self.generate_negative_samples(gdf, n_samples=len(gdf) * 2)
        negative_features = self.extract_features(negative_gdf)
        negative_features['label'] = 0

        # Combine positive and negative samples
        train_df = pd.concat([features_df, negative_features], ignore_index=True)
        X = train_df[self.feature_columns]
        y = train_df['label']

        # Train model
        self.model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
        self.model.fit(X, y)

        # Save model
        joblib.dump(self.model, self.model_path)

    def predict(self, lat, lng, date, crime_type=None):
        """Generate predictions for a location and date."""
        if not self.model:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
            else:
                self.train()

        gdf = self.preprocess_data()
        if not self.hotspot_centers:
            self.compute_hotspots(gdf)

        target_point = ShapelyPoint(lng, lat)
        target_datetime = datetime.strptime(date, '%Y-%m-%d')
        features_df = self.extract_features(gdf, target_point, target_datetime, crime_type)

        # Predict probabilities
        X = features_df[self.feature_columns]
        probabilities = self.model.predict_proba(X)[:, 1]

        # Generate GeoJSON features
        features = []
        for idx, prob in enumerate(probabilities):
            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lng, lat]
                },
                'properties': {
                    'probability': float(prob),
                    'crime_type': crime_type or 'ALL',
                    'radius': 300,
                    'factors': self.get_feature_importance(),
                    'address': None,  # To be enriched via reverse geocoding
                    'time_of_day': features_df['time_of_day'].iloc[idx]
                }
            }
            features.append(feature)

        return {
            'type': 'FeatureCollection',
            'features': features
        }

    def get_feature_importance(self):
        """Return feature importance for explainability."""
        if not self.model:
            return []
        importance = self.model.feature_importances_
        return [
            {'feature': col, 'importance': float(imp)}
            for col, imp in zip(self.feature_columns, importance)
        ]