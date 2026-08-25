import { makeListCreateHandler } from "../../../lib/crudHandlers";
import Sale from "../../../models/Sale";

const handlers = makeListCreateHandler(Sale, { section: "sales" });
export const GET = handlers.GET;
export const POST = handlers.POST;
