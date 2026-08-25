import { makeItemHandler } from "../../../../lib/crudHandlers";
import Sale from "../../../../models/Sale";

const handlers = makeItemHandler(Sale, { section: "sales" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
