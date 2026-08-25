import { makeItemHandler } from "../../../../lib/crudHandlers";
import Customer from "../../../../models/Customer";

const handlers = makeItemHandler(Customer, { section: "customers" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
