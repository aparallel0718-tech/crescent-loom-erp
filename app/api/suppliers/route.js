import { makeListCreateHandler } from "../../../lib/crudHandlers";
import Supplier from "../../../models/Supplier";

const handlers = makeListCreateHandler(Supplier, { section: "suppliers" });
export const GET = handlers.GET;
export const POST = handlers.POST;
