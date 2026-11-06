import mongoose from "mongoose";
import { env } from "./env.js";

// Si MongoDB se cae con la API en marcha, Mongoose guarda las consultas a la espera de que vuelva. Tras este
// tiempo se rinde y el errorHandler responde 503 (en vez de dejar al cliente esperando).
const WAIT_FOR_DB_MS = 5000;

mongoose.set("bufferTimeoutMS", WAIT_FOR_DB_MS);

// Avisos en el log cuando la conexión se pierde o vuelve sin que nadie la haya cerrado a propósito.
const onDisconnected = () => console.warn("MongoDB desconectado: las peticiones responderán 503 hasta que vuelva");
const onReconnected = () => console.log("MongoDB reconectado");
const onError = (err) => console.error("Error de conexión con MongoDB:", err.message);

export async function connectDB() {
  mongoose.connection.on("disconnected", onDisconnected);
  mongoose.connection.on("reconnected", onReconnected);
  mongoose.connection.on("error", onError);
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: WAIT_FOR_DB_MS });
  console.log("MongoDB connected");
}

/** Cierre intencionado (apagado de la API): sin el aviso de "desconectado". */
export async function disconnectDB() {
  mongoose.connection.off("disconnected", onDisconnected);
  await mongoose.disconnect();
}
