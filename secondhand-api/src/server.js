import "dotenv/config";
import { createWriteStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/product.routes.js";
import { errorHandler } from "./utils/errorHandler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(morgan("dev"));

const accessLogStream = createWriteStream(
  join(__dirname, "..", "logs", "access.log"),
  { flags: "a" }
);
app.use(morgan("combined", { stream: accessLogStream }));

app.use("/api/products", productRoutes);

app.use(errorHandler);

connectDB()
  .then(() =>
    app.listen(PORT, () => console.log(`API running on port ${PORT}`))
  )
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
