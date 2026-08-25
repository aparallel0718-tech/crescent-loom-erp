import { makeItemHandler } from "../../../../lib/crudHandlers";
import Purchase from "../../../../models/Purchase";

const handlers = makeItemHandler(Purchase, { section: "purchases" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
