import mongoose from "mongoose";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

const attributeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    values: { type: [String], default: [] },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "El nombre de la categoría es obligatorio"], trim: true },
    description: { type: String, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    attributes: { type: [attributeSchema], default: [] },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    ...baseFields,
  },
  baseOptions
);

categorySchema.index({ parentId: 1, order: 1 });

categorySchema.plugin(slugPlugin, { source: (doc) => doc.name });
categorySchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const Category = mongoose.model("Category", categorySchema);
