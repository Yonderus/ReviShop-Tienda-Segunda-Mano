import { createWriteStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { swaggerSpec } from "./config/swagger.js";
import productRoutes from "./routes/product.routes.js";
import { productVariantRoutes, productVariantsOfProductRoutes } from "./routes/productVariant.routes.js";
import { categoryRoutes, sellerRoutes } from "./routes/catalog.routes.js";
import { NotFoundError } from "./utils/AppError.js";
import { errorHandler } from "./utils/errorHandler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet());
// Abierto en desarrollo; en producción solo los orígenes de CORS_ORIGIN.
app.use(cors(env.isProduction ? { origin: env.CORS_ORIGIN?.split(",") } : undefined));
app.use(express.json());

app.use(morgan("dev"));
const accessLogStream = createWriteStream(join(__dirname, "..", "logs", "access.log"), { flags: "a" });
app.use(morgan("combined", { stream: accessLogStream }));

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "Revishop API" }));
app.use("/api/products/:id/variants", productVariantsOfProductRoutes);
app.use("/api/products", productRoutes);
app.use("/api/variants", productVariantRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sellers", sellerRoutes);

app.use((req, _res, next) => next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`)));

app.use(errorHandler);

connectDB()
  .then(() => app.listen(env.PORT, () => console.log(`API running on port ${env.PORT}`)))
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
