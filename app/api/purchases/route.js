import { makeListCreateHandler } from "../../../lib/crudHandlers";
import Purchase from "../../../models/Purchase";

const handlers = makeListCreateHandler(Purchase, { section: "purchases" });
export const GET = handlers.GET;
export const POST = handlers.POST;
