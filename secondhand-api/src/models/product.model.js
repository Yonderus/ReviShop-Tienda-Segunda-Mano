import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
      enum: [
        "electronica",
        "ropa",
        "hogar",
        "deportes",
        "vehiculos",
        "libros",
        "juguetes",
        "otros",
      ],
    },
    condition: {
      type: String,
      required: true,
      enum: ["nuevo", "como_nuevo", "bueno", "aceptable", "mejorable"],
    },
    location: { type: String, trim: true },
    images: { type: [String], default: [] },
    seller: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["disponible", "reservado", "vendido"],
      default: "disponible",
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

productSchema.pre("validate", function () {
  if (this.isModified("title")) this.slug = slugify(this.title);
});

export const Product = mongoose.model("Product", productSchema);
