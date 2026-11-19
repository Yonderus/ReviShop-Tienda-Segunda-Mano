import { z } from "zod";
import { coreApi } from "../clients/coreApi.client.js";
import { SLUG_PATTERN } from "../constants/shop.constants.js";
import { productDetail } from "./summaries.js";

const schema = z
  .object({
    slug: z.string().regex(SLUG_PATTERN, "slug no válido").max(120).describe("El slug del producto (de search_products)."),
  })
  .strict();

export const getProductTool = {
  name: "get_product",
  description: "Detalle de un producto: descripción (recortada) y variantes con su precio y estado.",
  schema,

  async run({ slug }) {
    const [product, variants] = await Promise.all([coreApi.getProduct(slug), coreApi.getProductVariants(slug)]);
    return productDetail(product, variants);
  },
};
