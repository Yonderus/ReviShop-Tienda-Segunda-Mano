import { slugify, uniqueSlug } from "../../utils/slugify.js";

/**
 * Añade `slug` (único) y lo calcula a partir de otros campos del documento.
 *
 * @param {(values: object) => string} options.source texto del que sale el slug
 * @param {string[]} [options.regenerateOn] si cambia alguno de estos campos el slug se recalcula, también
 *   en los PATCH (findOneAndUpdate). Sin ellos solo se calcula cuando el documento llega sin slug.
 * @param {boolean} [options.unique] true: añade -2, -3… si el slug ya existe. false: un slug repetido
 *   lo rechaza el índice único con un 409 (el service puede comprobarlo antes para dar un mensaje mejor).
 *
 * Uso: schema.plugin(slugPlugin, { source: (doc) => doc.title, regenerateOn: ["title"] })
 */
export function slugPlugin(schema, { source, regenerateOn = [], unique = false }) {
  schema.add({ slug: { type: String, required: true, unique: true, lowercase: true, trim: true } });

  const build = (Model, values, id) => (unique ? uniqueSlug(Model, source(values), id) : slugify(source(values)));

  schema.pre("validate", async function () {
    const changed = regenerateOn.some((field) => this.isModified(field));
    if ((this.slug && !changed) || !source(this)) return;
    this.slug = await build(this.constructor, this, this._id);
  });

  if (regenerateOn.length === 0) return;

  // En un PATCH el update solo trae los campos que cambian; el _id viene en el filtro.
  schema.pre("findOneAndUpdate", async function () {
    const update = this.getUpdate() ?? {};
    const values = { ...update, ...update.$set };
    if (!regenerateOn.some((field) => values[field] !== undefined)) return;
    this.set("slug", await build(this.model, values, this.getFilter()._id));
  });
}
