import { makeListCreateHandler } from "../../../lib/crudHandlers";
import Product from "../../../models/Product";

const handlers = makeListCreateHandler(Product, { section: "products" });
export const GET = handlers.GET;
export const POST = handlers.POST;
