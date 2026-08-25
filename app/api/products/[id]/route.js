import { makeItemHandler } from "../../../../lib/crudHandlers";
import Product from "../../../../models/Product";

const handlers = makeItemHandler(Product, { section: "products" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
