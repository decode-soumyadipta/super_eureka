import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

# Load the datasets
gdata = pd.read_csv('Gdata.csv')
hdata = pd.read_csv('Hdata.csv')

# Convert 'generated_date' to datetime
gdata['generated_date'] = pd.to_datetime(gdata['generated_date'], errors='coerce')
hdata['generated_date'] = pd.to_datetime(hdata['generated_date'], errors='coerce')

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

# Initialize and train the Linear Regression model
model = LinearRegression()
model.fit(X_train, y_train)

# Predict on the test data
y_pred = model.predict(X_test)

# Evaluate the model - Mean Squared Error
mse = mean_squared_error(y_test, y_pred)

# Plot Actual vs Predicted Waste
plt.figure(figsize=(10, 6))
plt.scatter(y_test, y_pred, color='blue', label='Predicted')
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], color='red', linewidth=2, label='Ideal')
plt.title('Actual vs Predicted Waste (Linear Regression)', fontsize=14)
plt.xlabel('Actual Waste (kg)', fontsize=12)
plt.ylabel('Predicted Waste (kg)', fontsize=12)
plt.legend()
plt.grid(True)

# Plot Residuals (Actual - Predicted)
plt.figure(figsize=(10, 6))
sns.histplot(y_test - y_pred, kde=True, color='green', label='Residuals')
plt.title('Residuals Distribution (Actual - Predicted)', fontsize=14)
plt.xlabel('Residuals (kg)', fontsize=12)
plt.ylabel('Frequency', fontsize=12)
plt.legend()
plt.grid(True)

# Show all plots simultaneously
plt.show()

# Print Model Evaluation
print(f'Mean Squared Error: {mse}')