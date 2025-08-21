import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import plotly.express as px
import plotly.graph_objects as go
from dash import Dash, dcc, html

# Load the datasets
gdata = pd.read_csv('Gdata.csv')
hdata = pd.read_csv('Hdata.csv')

# Convert 'generated_date' to datetime with format specification to avoid warning
gdata['generated_date'] = pd.to_datetime(gdata['generated_date'], errors='coerce', format='mixed')
hdata['generated_date'] = pd.to_datetime(hdata['generated_date'], errors='coerce', format='mixed')

# Drop rows with missing or invalid dates
gdata = gdata.dropna(subset=['generated_date'])
hdata = hdata.dropna(subset=['generated_date'])

# Drop rows with missing target values (predicted_waste_next_day)
gdata = gdata.dropna(subset=['predicted_waste_next_day'])
hdata = hdata.dropna(subset=['predicted_waste_next_day'])

# Convert categorical variables into numeric codes
gdata['disposal_method'] = gdata['disposal_method'].astype('category').cat.codes
gdata['recyclable'] = gdata['recyclable'].astype('category').cat.codes

hdata['disposal_method'] = hdata['disposal_method'].astype('category').cat.codes
hdata['hazardous'] = hdata['hazardous'].astype('category').cat.codes

# Combine both datasets
merged_data = pd.concat([gdata, hdata], ignore_index=True)

# Feature selection for model
features = ['weight_kg', 'cost_per_kg', 'disposal_method', 'recyclable', 'hazardous', 'storage_duration_days']
target = 'predicted_waste_next_day'

# Prepare data for modeling
X = merged_data[features]
y = merged_data[target]

# Handle missing values by filling with the mean of the column
X = X.fillna(X.mean())

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Initialize models
models = {
    "Linear Regression": LinearRegression(),
    "Decision Tree": DecisionTreeRegressor(random_state=42),
    "Random Forest": RandomForestRegressor(random_state=42)
}

# Train models and collect results
results = {}
for name, model in models.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    results[name] = (y_pred, mse)

# Create Dash app
app = Dash(__name__)

# Create figures using Plotly
figures = []
descriptions = []

for name, (y_pred, mse) in results.items():
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=y_test, y=y_pred, mode='markers', name='Predicted'))
    # Fixed: Use Scatter instead of deprecated Line
    fig.add_trace(go.Scatter(x=[y_test.min(), y_test.max()], y=[y_test.min(), y_test.max()], 
                            mode='lines', name='Ideal', line=dict(dash='dash')))
    fig.update_layout(title=f'{name} - Actual vs Predicted',
                      xaxis_title='Actual Waste (kg)',
                      yaxis_title='Predicted Waste (kg)')
    figures.append(fig)
    descriptions.append(f"{name} Model: Mean Squared Error = {mse:.2f}. This graph shows the relationship between actual and predicted waste values.")

# Layout of the Dash app
app.layout = html.Div(children=[
    html.H1(children='Waste Prediction Dashboard', style={'textAlign': 'center'}),
    html.Div(children='This dashboard provides insights into waste prediction using various models.', style={'textAlign': 'center'}),
    *[html.Div([
        dcc.Graph(figure=fig),
        html.P(description, style={'textAlign': 'center'})
    ]) for fig, description in zip(figures, descriptions)]
])

# Run the app - Fixed: Use app.run instead of app.run_server
if __name__ == '__main__':
    app.run(debug=True)