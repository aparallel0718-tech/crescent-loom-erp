import { makeListCreateHandler } from "../../../lib/crudHandlers";
import Inventory from "../../../models/Inventory";

const handlers = makeListCreateHandler(Inventory, { section: "inventory" });
export const GET = handlers.GET;
export const POST = handlers.POST;
