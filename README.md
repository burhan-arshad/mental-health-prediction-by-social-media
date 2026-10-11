# MindScope: Mental Health Prediction from Social Media Habits

MindScope is a web app that estimates a mental-health-related score from a student's social media usage, sleep, physical activity, study habits and stress level. A scikit-learn model is served through a FastAPI backend, and a vanilla HTML/CSS/JavaScript frontend displays the result.

> **Disclaimer:** MindScope gives a machine-learning estimate, **not a medical diagnosis**. It must not replace professional mental-health advice.

## Live Demo

- **Web app:** https://mental-health-prediction-by-social-media-68vp.onrender.com/
- **Backend API:** https://mental-health-prediction-by-social-media.onrender.com/
- **Source code:** https://github.com/burhan-arshad/mental-health-prediction-by-social-media
- **Interactive API docs:** https://mental-health-prediction-by-social-media.onrender.com/docs

> The backend is hosted on Render. If it has been idle, the first request can take 30–60 seconds while the service wakes up.

## Features

- 12-field assessment form with validation and clear error messages
- Real predictions from the trained model (nothing is simulated)
- Result shown as a **percentage** (model score × 10) with a circular gauge
- Live backend connection indicator
- Summary of submitted answers, plus print / save as PDF
- Responsive layout, keyboard-accessible controls, privacy and responsible-use notice
- No analytics, tracking or third-party data submission

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript (ES6+), Font Awesome, Google Fonts (Manrope) |
| Backend | FastAPI, Pydantic, Uvicorn |
| Machine learning | pandas, NumPy, scikit-learn (Pipeline, ColumnTransformer, RandomForestRegressor), joblib |
| Hosting | Render (API) |

## Project Structure

```
mental-health-prediction-by-social-media/
├── index.html                                         # Frontend page structure
├── style.css                                          # Styling, responsive rules, print styles
├── script.js                                          # Validation, API calls, result rendering
├── main.py                                            # FastAPI backend
├── mental_health_model.pkl                            # Trained scikit-learn pipeline
├── requirements.txt                                   # Python dependencies
├── project.ipynb                                      # Data analysis and model training notebook
├── ML Project.html                                    # HTML export of the notebook
├── Student Social Media And Mental Health Impact.csv  # Dataset
└── .gitignore
```

## Dataset and Model

- **Dataset:** *Student Social Media And Mental Health Impact* (CSV)
- **Target:** `Mental_Health_Score`, on a 0–10 scale
- **Features (12):** age, gender, country, academic level, most used platform, purpose of use, average daily usage hours, daily unlocks, study hours, physical activity hours, sleep hours per night, stress level
- **Preprocessing:**
  - Duplicates dropped; negative physical activity values clipped to 0
  - Country grouped into the most frequent countries plus `Other`
  - `Study_Hours`: log transform + standard scaling
  - Other numeric features: standard scaling
  - `Stress_Level`: ordinal encoding (Low < Medium < High < Very High)
  - Other categorical features: one-hot encoding
- **Models compared:** Linear Regression, Random Forest (default), Random Forest (tuned with `RandomizedSearchCV`), evaluated with R², MAE and RMSE on a 70/30 train/test split (`random_state=42`)
- **Deployed model:** the Random Forest pipeline saved to `mental_health_model.pkl`

## API Reference

**`GET /`** returns `{"message": "Welcome to the Mental Health Prediction API!"}`

**`POST /predict`**

```json
{
  "age": 21,
  "gender": "Male",
  "country": "India",
  "academic_level": "Undergraduate",
  "most_used_platform": "Instagram",
  "purpose_of_use": "Education",
  "avg_daily_usage_hours": 4.5,
  "daily_unlocks": 65,
  "study_hours": 5,
  "physical_activity_hours": 1,
  "sleep_hours_per_night": 7.5,
  "stress_level": "Medium"
}
```

Response:

```json
{ "predicted_mental_health": 6.54 }
```

The value is on the model's 0–10 scale. The frontend converts it to a percentage (`score × 10`). Invalid input returns HTTP `422` with details.

| Field | Allowed values |
|---|---|
| `age` | integer, 10–100 |
| `gender` | Male, Female |
| `academic_level` | Undergraduate, Graduate, High School |
| `most_used_platform` | Facebook, LinkedIn, Instagram, Snapchat, Twitter, YouTube, TikTok, LINE, KakaoTalk, VKontakte, WhatsApp, WeChat |
| `purpose_of_use` | Networking, Education, Entertainment, News |
| `avg_daily_usage_hours`, `study_hours`, `physical_activity_hours`, `sleep_hours_per_night` | number, 0–24 |
| `daily_unlocks` | integer, 0 or more |
| `stress_level` | Low, Medium, High, Very High |

## Run Locally

**Backend**

```bash
git clone https://github.com/burhan-arshad/mental-health-prediction-by-social-media.git
cd mental-health-prediction-by-social-media
pip install -r requirements.txt
uvicorn main:app --reload      # http://127.0.0.1:8000
```

**Frontend**

1. In `script.js`, set `API_BASE` to `http://127.0.0.1:8000`.
2. Serve the project folder over HTTP in a second terminal:

```bash
python -m http.server 5500     # then open http://localhost:5500
```

## Deployment Notes

- Set `API_BASE` in `script.js` to your deployed API URL.
- A site served over HTTPS must call an HTTPS API.
- The backend's CORS settings must allow the frontend's origin (`allow_origins=["*"]` now; restrict it to your domain for production).

## Troubleshooting

| Problem | What to check |
|---|---|
| Status shows "Disconnected" | The backend may be asleep (Render free tier) or offline. Wait and retry. |
| CORS error in the browser console | Allow the frontend's origin in FastAPI's `CORSMiddleware`. |
| `422` error | One of the values is outside the accepted range; the message names the field. |

## Limitations

- Predictions depend on the training data and model; they are estimates only.
- The tool does not detect, diagnose or treat any mental-health condition.

## Author

Developed by **Burhan Arshad** · [GitHub](https://github.com/burhan-arshad)
