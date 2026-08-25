import { makeItemHandler } from "../../../../lib/crudHandlers";
import Inventory from "../../../../models/Inventory";

const handlers = makeItemHandler(Inventory, { section: "inventory" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
