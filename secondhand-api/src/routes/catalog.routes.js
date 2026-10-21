import { Router } from "express";
import { getCategories, getSellers } from "../controllers/catalog.controller.js";

/** Solo lectura: alimentan los select del front. No hay CRUD de categorías ni de usuarios. */
export const categoryRoutes = Router().get("/", getCategories);
export const sellerRoutes = Router().get("/", getSellers);
