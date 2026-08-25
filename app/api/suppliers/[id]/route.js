import { makeItemHandler } from "../../../../lib/crudHandlers";
import Supplier from "../../../../models/Supplier";

const handlers = makeItemHandler(Supplier, { section: "suppliers" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
