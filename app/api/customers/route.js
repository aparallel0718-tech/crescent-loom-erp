import { makeListCreateHandler } from "../../../lib/crudHandlers";
import Customer from "../../../models/Customer";

const handlers = makeListCreateHandler(Customer, { section: "customers" });
export const GET = handlers.GET;
export const POST = handlers.POST;
