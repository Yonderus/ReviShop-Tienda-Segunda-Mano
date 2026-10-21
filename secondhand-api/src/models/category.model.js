import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";
import { baseFields, baseOptions } from "./base.fields.js";

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
    slug: { type: String, required: true, unique: true },
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

categorySchema.pre("validate", function () {
  if (!this.slug && this.name) this.slug = slugify(this.name);
});

export const Category = mongoose.model("Category", categorySchema);
