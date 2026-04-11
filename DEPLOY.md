# Public Deployment

This project is prepared for a single-project Vercel deployment:

- React builds from [ape](./ape)
- the API runs from [api/index.js](./api/index.js)
- MongoDB Atlas remains the live database
- frontend uses `/api/personnel` in production and `http://localhost:5000/api/personnel` only on local development

## Vercel

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Vercel will detect [vercel.json](./vercel.json).
4. Add the `MONGO_URI` environment variable in Vercel Project Settings.
5. Deploy.

The public Vercel URL will serve both:

- the frontend app
- the backend API routes under `/api/*`

## MongoDB Atlas

Make sure Atlas has:

- an active cluster
- a valid database user with read/write access
- network access that allows Vercel functions to connect

## Local

For local development:

- frontend: `cd ape && npm start`
- backend: `cd backend && node server.js`
