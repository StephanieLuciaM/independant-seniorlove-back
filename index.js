import "dotenv/config";
import express from "express";
import { router } from "./src/routes/index.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { bodySanitizer } from "./src/middlewares/sanitizeMiddleware.js";

const app = express();

// Helmet permitted to secure the API by setting various HTTP headers
app.use(helmet());

// CORS module: specify who can access the API
app.use(cors({
  origin: ['http://localhost:5173', 'https://seniorlove.vercel.app'],
  credentials: true,
  methods: "GET, PUT, POST, PATCH, DELETE",
  allowedHeaders: "Content-Type, Authorization"
}));

app.use(cookieParser());

// Body parser configuration (to retrieve form data)
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Allow interpreting data provided in a POST, PATCH, or PUT request as JSON

// Use body sanitizer middleware before routes
app.use(bodySanitizer);

// Use routes
app.use(router);

// Start a server
const PORT = process.env.PORT || 3000;

// Log attempt to start server
console.log(`Attempting to start server on PORT: ${PORT}`);

// Explicitly binding to 0.0.0.0 to ensure the app is accessible from outside the container
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server successfully listening at http://0.0.0.0:${PORT}`);
});