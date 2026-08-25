import { makeItemHandler } from "../../../../lib/crudHandlers";
import Expense from "../../../../models/Expense";

const handlers = makeItemHandler(Expense, { section: "expenses" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
