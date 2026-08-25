import { makeListCreateHandler } from "../../../lib/crudHandlers";
import Alert from "../../../models/Alert";

const handlers = makeListCreateHandler(Alert, { section: "alerts" });
export const GET = handlers.GET;
export const POST = handlers.POST;
