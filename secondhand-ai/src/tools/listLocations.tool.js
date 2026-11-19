import { z } from "zod";
import { coreApi } from "../clients/coreApi.client.js";

export const listLocationsTool = {
  name: "list_locations",
  description: "Ubicaciones con productos a la venta, con su slug y cuántos productos hay en cada una.",
  schema: z.object({}).strict(),

  async run() {
    const locations = await coreApi.listLocations();
    return locations.map(({ name, slug, productsCount }) => ({ name, slug, productsCount }));
  },
};
