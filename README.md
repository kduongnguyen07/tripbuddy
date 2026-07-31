# TripBuddy

## Backend

Run from the repository root:

```bash
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload
```

API documentation is available at `http://127.0.0.1:8000/docs`.

- `GET /api/v1/destinations`
- `POST /api/v1/destinations/recommend`
- `POST /api/v1/plans/generate`
- `POST /api/v1/plans/swap-options`
- `POST /api/v1/plans/apply-swap`

`backend/tripbuddy_full_dataset_500.json` is the dataset including Hà Nội, Huế, Đà Nẵng, Đà Lạt and Phú Quốc.
