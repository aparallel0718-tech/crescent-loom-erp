import { makeItemHandler } from "../../../../lib/crudHandlers";
import Alert from "../../../../models/Alert";

const handlers = makeItemHandler(Alert, { section: "alerts" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
