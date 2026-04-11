# APE Monitoring

APE Monitoring is a React app with a lightweight Node backend for personnel medical records.

## Scripts

In the `ape` folder:

- `npm start` runs the React frontend on port `3000`.
- `npm run server` runs the backend API on port `4000`.
- `npm run build` creates a production build.
- `npm test` runs the frontend test suite.

## SQLite Storage

The backend now uses SQLite.

- Default database file: `%LOCALAPPDATA%/APE Monitoring/ape.sqlite`
- Optional overrides: `APE_DB_DIR` or `APE_DB_PATH`
- API: `http://localhost:4000/api`
- Main endpoint: `GET/PUT /api/store`

On the first backend start, the server will:

- create the SQLite database if it does not exist
- migrate records from `backend/data/store.json` if that legacy file is present
- otherwise seed the database with the default personnel data plus birthday records

The frontend API contract is unchanged, so the app should continue working as before while now storing data in SQL.
