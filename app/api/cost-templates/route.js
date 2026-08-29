import { makeListCreateHandler } from "../../../lib/crudHandlers";
import CostTemplate from "../../../models/CostTemplate";
const handlers = makeListCreateHandler(CostTemplate, { section: "products" });
export const GET = handlers.GET;
export const POST = handlers.POST;