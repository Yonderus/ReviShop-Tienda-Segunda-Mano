import { IMAGE_OWNER } from "../constants/image.constants.js";
import { imageRepository } from "../repositories/image.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { productVariantRepository } from "../repositories/productVariant.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/AppError.js";
import { DEFAULT_OPTIONS_KEY, buildOptionsKey, buildSku, variantSlugBase } from "../utils/productVariant.utils.js";
import { withNumericSuffix } from "../utils/slugify.js";
import { categoryService } from "./category.service.js";
import { productService } from "./product.service.js";

async function findLiveProduct(productId) {
  const product = await productRepository.findRawById(productId);
  if (!product || product.deletedAt) throw new NotFoundError("Producto no encontrado");
  return product;
}

async function findLiveVariant(id) {
  const variant = await productVariantRepository.findById(id);
  if (!variant) throw new NotFoundError("Variante no encontrada");
  return variant;
}

/** ABAC: una variante la modifica el vendedor de su producto o un admin (la regla es la del producto). */
async function findVariantToModify(id, actor) {
  const variant = await findLiveVariant(id);
  productService.assertCanModify(actor, await productRepository.findRawById(variant.productId));
  return variant;
}

/**
 * Cada opción tiene que ser un atributo de la categoría del producto (los suyos o los de su padre) y, si el
 * atributo define valores, uno de ellos. Sin atributos repetidos en la misma variante.
 */
async function assertOptions(product, options) {
  const attributes = await categoryService.attributesFor(product.categoryId);
  const errors = [];
  const seen = new Set();

  options.forEach(({ key, value }, index) => {
    const attribute = attributes.find((a) => a.key === key);
    if (seen.has(key)) {
      errors.push({ field: `options.${index}.key`, message: `La opción "${key}" está repetida` });
    } else if (!attribute) {
      const valid = attributes.map((a) => a.key).join(", ");
      const message = valid
        ? `"${key}" no es un atributo de esta categoría (valen: ${valid})`
        : "La categoría de este producto no tiene atributos para crear variantes";
      errors.push({ field: `options.${index}.key`, message });
    } else if (attribute.values.length && !attribute.values.includes(value)) {
      errors.push({
        field: `options.${index}.value`,
        message: `"${value}" no es un valor de ${attribute.label} (valen: ${attribute.values.join(", ")})`,
      });
    }
    seen.add(key);
  });

  if (errors.length) throw new ValidationError(undefined, errors);
}

export const productVariantService = {
  /** Público, salvo las de un producto inactivo: esas solo las ven su dueño y los admin (404 al resto). */
  async listByProduct(productId, actor = null) {
    productService.assertCanSee(actor, await findLiveProduct(productId));
    return productVariantRepository.findLiveByProduct(productId);
  },

  /**
   * Crea una variante con opciones. Reglas:
   * - opciones repetidas respecto a otra variante viva → 409;
   * - si coinciden con una variante eliminada, se recupera esa (mismo SKU y slug) en vez de chocar con el índice único;
   * - la primera variante con opciones sustituye a la "Única" (la de sin opciones), que pasa a la papelera.
   */
  async create(productId, { options, price = null, stock = 1 }, actor) {
    const product = await findLiveProduct(productId);
    productService.assertCanModify(actor, product);
    await assertOptions(product, options);

    const optionsKey = buildOptionsKey(options);
    const all = await productVariantRepository.findAllByProduct(productId);
    const sameOptions = all.find((v) => v.optionsKey === optionsKey);
    if (sameOptions && !sameOptions.deletedAt) {
      throw ConflictError.forField("options", "Ya existe una variante con esas opciones");
    }

    const values = options.map((o) => o.value);
    let variant;
    if (sameOptions) {
      variant = await productVariantRepository.restoreById(sameOptions._id, { price, stock, isActive: true, status: "disponible" });
      await imageRepository.restoreByOwners(IMAGE_OWNER.PRODUCT_VARIANT, [sameOptions._id], sameOptions.deletedAt);
    } else {
      variant = await productVariantRepository.create({
        productId,
        sku: await withNumericSuffix(buildSku(product.slug, values), (sku) => productVariantRepository.existsSku(sku)),
        slug: await productVariantRepository.uniqueSlug(variantSlugBase(product.slug, values)),
        options,
        price,
        stock,
        order: Math.max(-1, ...all.map((v) => v.order)) + 1,
      });
    }

    // Después de crear la nueva: si algo falla antes, el producto no se queda sin variantes.
    const defaults = all.filter((v) => !v.deletedAt && v.optionsKey === DEFAULT_OPTIONS_KEY).map((v) => v._id);
    if (defaults.length) {
      const date = new Date();
      await productVariantRepository.softDeleteByIds(defaults, date);
      await imageRepository.softDeleteByOwners(IMAGE_OWNER.PRODUCT_VARIANT, defaults, date);
    }

    await productService.recalculateStatus(productId);
    return productVariantRepository.findById(variant._id);
  },

  async update(id, { price, stock }, actor) {
    await findVariantToModify(id, actor);
    const changes = Object.fromEntries(Object.entries({ price, stock }).filter(([, v]) => v !== undefined));
    await productVariantRepository.updateById(id, changes);
    return productVariantRepository.findById(id);
  },

  async changeStatus(id, status, actor) {
    const variant = await findVariantToModify(id, actor);
    await productVariantRepository.updateById(id, { status });
    await productService.recalculateStatus(variant.productId);
    return productVariantRepository.findById(id);
  },

  async setActive(id, isActive, actor) {
    await findVariantToModify(id, actor);
    await productVariantRepository.updateById(id, { isActive });
    return productVariantRepository.findById(id);
  },

  /** Soft delete con sus imágenes. Un producto necesita al menos una variante. */
  async softDelete(id, actor) {
    const variant = await findVariantToModify(id, actor);
    const live = await productVariantRepository.findLiveByProduct(variant.productId);
    if (live.length <= 1) {
      throw new ConflictError("Un producto necesita al menos una variante: si quieres quitarla, borra el producto");
    }
    const date = new Date();
    await productVariantRepository.softDeleteByIds([variant._id], date);
    await imageRepository.softDeleteByOwners(IMAGE_OWNER.PRODUCT_VARIANT, [variant._id], date);
    await productService.recalculateStatus(variant.productId);
  },
};
