import { z } from "zod";
import { coreApi } from "../clients/coreApi.client.js";

export const listCategoriesTool = {
  name: "list_categories",
  description: "Categorías de la tienda con su slug y cuántos productos tienen. Úsala para no inventarte slugs de categoría.",
  schema: z.object({}).strict(),

  async run() {
    const categories = await coreApi.listCategories();
    const names = Object.fromEntries(categories.map((category) => [String(category._id), category.slug]));
    return categories.map((category) => ({
      name: category.name,
      slug: category.slug,
      parent: category.parentId ? (names[String(category.parentId)] ?? null) : null,
      productsCount: category.productsCount,
    }));
  },
};
