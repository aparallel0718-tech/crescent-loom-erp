import { makeListCreateHandler } from "../../../lib/crudHandlers";
import Inventory from "../../../models/Inventory";
import Product from "../../../models/Product"; // ensures Product schema is registered for populate

const handlers = makeListCreateHandler(Inventory, { section: "inventory", populate: "product" });
export const GET = handlers.GET;
export const POST = handlers.POST;