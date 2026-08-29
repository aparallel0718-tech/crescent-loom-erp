import { makeItemHandler } from "../../../../lib/crudHandlers";
import CostTemplate from "../../../../models/CostTemplate";
const handlers = makeItemHandler(CostTemplate, { section: "products" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;