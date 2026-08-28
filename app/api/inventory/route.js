import { makeListCreateHandler } from "../../../lib/crudHandlers";
import Inventory from "../../../models/Inventory";

const handlers = makeListCreateHandler(Inventory, { section: "inventory", populate: "product" });
export const GET = handlers.GET;
export const POST = handlers.POST;