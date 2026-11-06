import { createWriteStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { swaggerSpec } from "./config/swagger.js";
import { checkOrigin } from "./middlewares/origin.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import { productVariantRoutes, productVariantsOfProductRoutes } from "./routes/productVariant.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import roleRoutes from "./routes/role.routes.js";
import shopRoutes from "./routes/shop.routes.js";
import userRoutes, { sellerRoutes } from "./routes/user.routes.js";
import { NotFoundError } from "./utils/AppError.js";
import { errorHandler } from "./utils/errorHandler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet());
// La sesión va en una cookie: solo los orígenes del front (CORS_ORIGIN) y con `credentials`, también en
// desarrollo. Con un origen abierto (`*`), el navegador no enviaría la cookie.
app.use(cors({ origin: [...env.corsOrigins], credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use(morgan("dev"));
const accessLogStream = createWriteStream(join(__dirname, "..", "logs", "access.log"), { flags: "a" });
app.use(morgan("combined", { stream: accessLogStream }));

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "Revishop API" }));
// Escrituras solo desde el front o la propia API (defensa contra CSRF, junto con SameSite=Strict).
app.use("/api", checkOrigin);
// Quién puede usar cada ruta lo dice su archivo de rutas (authenticate, adminOnly). Lo que no lo pone es público.
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/products/:id/variants", productVariantsOfProductRoutes);
app.use("/api/products", productRoutes);
app.use("/api/variants", productVariantRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sellers", sellerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
// Tienda pública (Home y Shop), separada del CRUD de productos.
app.use("/api/shop", shopRoutes);

app.use((req, _res, next) => next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`)));

app.use(errorHandler);

connectDB()
  .then(() => app.listen(env.PORT, () => console.log(`API running on port ${env.PORT}`)))
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
