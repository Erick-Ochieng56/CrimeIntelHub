from django.core.management.base import BaseCommand
from crimes.models import Crime
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
import pandas as pd

class Command(BaseCommand):
    help = 'Train a crime prediction model using historical data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Fetching historical crime data...')

        # Fetch data from the Crime model
        crimes = Crime.objects.all()
        data = [
            {
                'latitude': crime.location.y if crime.location else None,
                'longitude': crime.location.x if crime.location else None,
                'date': crime.date,
                'time': crime.time,
                'crime_type': crime.category.name,
                'is_violent': crime.is_violent,
            }
            for crime in crimes
        ]

        # Convert to DataFrame
        df = pd.DataFrame(data)

        # Drop rows with missing values
        df.dropna(inplace=True)

        # Feature engineering
        df['hour'] = pd.to_datetime(df['time'], format='%H:%M:%S').dt.hour
        df['day_of_week'] = pd.to_datetime(df['date']).dt.dayofweek
        df['month'] = pd.to_datetime(df['date']).dt.month

        # Encode categorical variables
        df = pd.get_dummies(df, columns=['crime_type'], drop_first=True)

        # Define features and target
        X = df[['latitude', 'longitude', 'hour', 'day_of_week', 'month'] + [col for col in df.columns if col.startswith('crime_type_')]]
        y = df['is_violent']

        # Split data into training and testing sets
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Train the model
        self.stdout.write('Training the model...')
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)

        # Evaluate the model
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        self.stdout.write(f'Model accuracy: {accuracy * 100:.2f}%')

        # Save the model
        model_path = 'crime_prediction_model.pkl'
        joblib.dump(model, model_path)
        self.stdout.write(f'Model saved to {model_path}')