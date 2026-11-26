import { IMAGE_OWNER } from "../constants/image.constants.js";
import {
  REVIEW_WINDOW_HOURS,
  SALE_CLOSE_REASON,
  SALE_CONFIRM_DAYS,
  SALE_MESSAGES,
  SALE_ROLE,
  SALE_STATE,
} from "../constants/sale.constants.js";
import { imageRepository } from "../repositories/image.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { productVariantRepository } from "../repositories/productVariant.repository.js";
import { reviewRepository } from "../repositories/review.repository.js";
import { saleRepository } from "../repositories/sale.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { isAdmin } from "../utils/access.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../utils/AppError.js";
import { paginationOf, skipFor } from "../utils/pagination.js";
import { productService } from "./product.service.js";
import { toOwnReview, toPublicReview } from "./review.service.js";
import { userService } from "./user.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const sameId = (a, b) => String(a) === String(b);

/** "Talla M · Azul" a partir de las opciones; null en la variante única. */
const variantLabelOf = (variant) => (variant.options?.length ? variant.options.map((option) => option.value).join(" · ") : null);

/** El comprador, o el MISMO 422 exista o no la cuenta (así registrar una venta no sirve para averiguar emails). */
async function findBuyer(email) {
  const buyer = await userRepository.findRawByEmail(email);
  try {
    await userService.assertCanLogIn(buyer);
  } catch {
    throw ValidationError.forField("buyerEmail", SALE_MESSAGES.BUYER_NOT_FOUND);
  }
  return buyer;
}

/**
 * Una venta solo la ven sus dos partes (y un admin). Al resto, 404 y no 403: ni siquiera se dice que existe,
 * porque dice quién le ha comprado qué a quién.
 */
async function findSaleFor(id, actor, now) {
  await saleRepository.expireOverdue({ _id: id }, now);
  const sale = await saleRepository.findRawById(id);
  const isParty = sale && (sameId(sale.sellerId, actor.id) || sameId(sale.buyerId, actor.id));
  if (!sale || (!isParty && !isAdmin(actor))) throw new NotFoundError(SALE_MESSAGES.NOT_FOUND);
  return sale;
}

/** Devuelve la variante al estado que tenía antes de registrar la venta (al rechazarla o cancelarla). */
async function restoreVariant(sale) {
  const variant = await productVariantRepository.findById(sale.variantId);
  if (!variant) return; // la variante o el producto ya no existen: no hay nada que devolver
  await productVariantRepository.updateById(sale.variantId, { status: sale.previousVariantStatus });
  await productService.recalculateStatus(sale.productId);
}

/**
 * Cambia una venta pendiente. Si entre tanto ha cambiado (el otro la confirmó o canceló a la vez, o caducó),
 * 409: la operación no se aplica a medias.
 */
async function changePending(sale, now, changes) {
  if (sale.status !== SALE_STATE.PENDING) throw new ConflictError(SALE_MESSAGES.NOT_PENDING);
  const updated = await saleRepository.updateIfPending(sale._id, now, changes);
  if (!updated) throw new ConflictError(SALE_MESSAGES.NOT_PENDING);
  return updated;
}

/**
 * Las valoraciones de una venta, vistas por una de sus partes (sistema ciego):
 * - `mine`: la mía, siempre (aunque aún no sea pública);
 * - `theirs`: la del otro, SOLO si ya es pública y no está oculta;
 * - `theirsSubmitted`: si el otro ya ha valorado, sin decir la nota («X ya te ha valorado: valora tú para verla»).
 */
function reviewsView(reviews, actor, now, otherParty) {
  const mine = reviews.find((review) => sameId(review.reviewerId, actor.id));
  const theirs = reviews.find((review) => !sameId(review.reviewerId, actor.id));
  const theirsView = theirs && theirs.visibleAt <= now && !theirs.hiddenAt ? toPublicReview({ ...theirs, reviewerId: null }) : null;
  return {
    mine: mine ? toOwnReview(mine, now) : null,
    // Quien la escribió es la otra parte de la venta, que ya sale con su nombre en la propia venta.
    theirs: theirsView && otherParty ? { ...theirsView, reviewer: otherParty } : theirsView,
    theirsSubmitted: Boolean(theirs),
  };
}

/**
 * Lo que ve cada parte de una venta: su papel, la otra parte (nombre y slug, nunca el email), sus valoraciones y
 * qué puede hacer con ella ahora. Así el front no repite las reglas. `reviews`: las de esta venta.
 */
function toView(sale, actor, now, reviews = []) {
  const role = sameId(sale.sellerId?._id ?? sale.sellerId, actor.id) ? SALE_ROLE.SELLER : SALE_ROLE.BUYER;
  const pending = sale.status === SALE_STATE.PENDING;
  const party = (user) => (user && user.name ? { _id: user._id, name: user.name, slug: user.slug } : null);
  const other = party(role === SALE_ROLE.SELLER ? sale.buyerId : sale.sellerId);
  const reviewView = reviewsView(reviews, actor, now, other && { name: other.name, slug: other.slug });
  return {
    _id: sale._id,
    status: sale.status,
    role,
    productId: sale.productId,
    variantId: sale.variantId,
    product: sale.snapshot,
    seller: party(sale.sellerId),
    buyer: party(sale.buyerId),
    createdAt: sale.createdAt,
    expiresAt: sale.expiresAt,
    confirmedAt: sale.confirmedAt,
    reviewWindowEndsAt: sale.reviewWindowEndsAt,
    closedAt: sale.closedAt,
    closeReason: sale.closeReason,
    reviews: reviewView,
    can: {
      confirm: pending && role === SALE_ROLE.BUYER,
      reject: pending && role === SALE_ROLE.BUYER,
      cancel: pending && role === SALE_ROLE.SELLER,
      // Confirmada, dentro de la ventana y sin haber valorado ya (no se edita).
      review: sale.status === SALE_STATE.CONFIRMED && sale.reviewWindowEndsAt > now && !reviewView.mine,
    },
  };
}

async function detailView(id, actor, now) {
  return toView(await saleRepository.findDetailById(id), actor, now);
}

export const saleService = {
  /**
   * El vendedor (o un admin) registra que ha vendido una variante a otro usuario, por su email:
   * - la variante existe y no tiene otra venta viva (pendiente o confirmada) → si no, 409;
   * - el comprador tiene cuenta y puede entrar, y no es el vendedor;
   * - la variante pasa a "vendido" (y se recalcula el estado del producto); la venta queda pendiente de que el
   *   comprador la confirme durante SALE_CONFIRM_DAYS días.
   *
   * Vale aunque la variante ya estuviera "vendido" (marcada a mano antes de que existieran las ventas): lo que
   * cuenta es que no tenga otra venta registrada.
   */
  async register({ variantId, buyerEmail }, actor) {
    const now = new Date();
    const variant = await productVariantRepository.findById(variantId);
    if (!variant) throw new NotFoundError("Variante no encontrada");
    const product = await productRepository.findRawById(variant.productId);
    if (!product || product.deletedAt) throw new NotFoundError("Producto no encontrado");
    productService.assertCanModify(actor, product);

    const buyer = await findBuyer(buyerEmail);
    // El vendedor es el del producto (aunque registre la venta un admin): nadie se vende a sí mismo.
    if (sameId(buyer._id, product.sellerId)) throw ValidationError.forField("buyerEmail", SALE_MESSAGES.SELF_SALE);

    await saleRepository.expireOverdue({ variantId }, now);
    if (await saleRepository.findLiveByVariant(variantId)) throw new ConflictError(SALE_MESSAGES.ALREADY_REGISTERED);

    let sale;
    try {
      sale = await saleRepository.create({
        productId: product._id,
        variantId,
        sellerId: product.sellerId,
        buyerId: buyer._id,
        snapshot: {
          title: product.title,
          slug: product.slug,
          variantLabel: variantLabelOf(variant),
          price: variant.price ?? product.basePrice,
          imageUrl:
            (await imageRepository.findPrimaryUrl(IMAGE_OWNER.PRODUCT_VARIANT, variant._id)) ??
            (await imageRepository.findPrimaryUrl(IMAGE_OWNER.PRODUCT, product._id)),
        },
        previousVariantStatus: variant.status,
        expiresAt: new Date(now.getTime() + SALE_CONFIRM_DAYS * DAY_MS),
      });
    } catch (error) {
      // Dos registros a la vez de la misma variante: el índice único parcial deja pasar solo uno.
      if (error?.code === 11000) throw new ConflictError(SALE_MESSAGES.ALREADY_REGISTERED);
      throw error;
    }

    // Después de crear la venta: si marcar la variante falla, se deshace el registro (sin transacciones).
    try {
      await productVariantRepository.updateById(variantId, { status: "vendido" });
      await productService.recalculateStatus(product._id);
    } catch (error) {
      await saleRepository.hardDeleteById(sale._id);
      throw error;
    }
    return detailView(sale._id, actor, now);
  },

  /** El comprador dice que sí: se abre la ventana de REVIEW_WINDOW_HOURS horas para valorarse. */
  async confirm(id, actor) {
    const now = new Date();
    const sale = await findSaleFor(id, actor, now);
    if (!sameId(sale.buyerId, actor.id)) throw new ForbiddenError(SALE_MESSAGES.ONLY_BUYER);
    await changePending(sale, now, {
      status: SALE_STATE.CONFIRMED,
      confirmedAt: now,
      reviewWindowEndsAt: new Date(now.getTime() + REVIEW_WINDOW_HOURS * HOUR_MS),
    });
    return detailView(id, actor, now);
  },

  /** El comprador dice que no ha sido él: la variante vuelve a como estaba. */
  async reject(id, actor) {
    const now = new Date();
    const sale = await findSaleFor(id, actor, now);
    if (!sameId(sale.buyerId, actor.id)) throw new ForbiddenError(SALE_MESSAGES.ONLY_BUYER);
    const updated = await changePending(sale, now, { status: SALE_STATE.REJECTED, closedAt: now, closeReason: SALE_CLOSE_REASON.BUYER_REJECTED });
    await restoreVariant(updated);
    return detailView(id, actor, now);
  },

  /** El vendedor (o un admin) la cancela mientras está pendiente: la variante vuelve a como estaba. */
  async cancel(id, actor) {
    const now = new Date();
    const sale = await findSaleFor(id, actor, now);
    if (!sameId(sale.sellerId, actor.id) && !isAdmin(actor)) throw new ForbiddenError(SALE_MESSAGES.ONLY_SELLER);
    const updated = await changePending(sale, now, { status: SALE_STATE.CANCELLED, closedAt: now, closeReason: SALE_CLOSE_REASON.SELLER_CANCELLED });
    await restoreVariant(updated);
    return detailView(id, actor, now);
  },

  /** Mi actividad: mis ventas (`as=seller`) o mis compras (`as=buyer`), paginadas. `productId`: las de un producto. */
  async listMine(actor, { as, status, productId, page, limit }) {
    const now = new Date();
    const field = as === SALE_ROLE.SELLER ? "sellerId" : "buyerId";
    await saleRepository.expireOverdue({ [field]: actor.id }, now);
    const { items, total } = await saleRepository.findPageFor(field, actor.id, { status, productId, skip: skipFor(page, limit), limit });
    // Las valoraciones de las ventas de la página, en una sola consulta.
    const reviews = await reviewRepository.findBySales(items.map((sale) => sale._id));
    const reviewsOf = (sale) => reviews.filter((review) => sameId(review.saleId, sale._id));
    return { items: items.map((sale) => toView(sale, actor, now, reviewsOf(sale))), pagination: paginationOf(total, page, limit) };
  },

  /**
   * Lo pendiente para el aviso del menú:
   * - `salesToConfirm`: compras que el vendedor ha registrado y espero confirmar;
   * - `reviewsToWrite`: ventas confirmadas, aún en su ventana, que no he valorado;
   * - `othersReviewedMe`: de esas, en las que el otro ya me ha valorado (sin decir la nota: el sistema es ciego).
   */
  async pendingFor(actor) {
    const now = new Date();
    await saleRepository.expireOverdue({ buyerId: actor.id }, now);
    const [salesToConfirm, reviewable] = await Promise.all([
      saleRepository.countPendingToConfirm(actor.id, now),
      saleRepository.findReviewable(actor.id, now),
    ]);
    const reviews = await reviewRepository.findBySales(reviewable.map((sale) => sale._id));
    const reviewed = (sale, byMe) =>
      reviews.some((review) => sameId(review.saleId, sale._id) && sameId(review.reviewerId, actor.id) === byMe);
    const toWrite = reviewable.filter((sale) => !reviewed(sale, true));
    return {
      salesToConfirm,
      reviewsToWrite: toWrite.length,
      othersReviewedMe: toWrite.filter((sale) => reviewed(sale, false)).length,
    };
  },
};
