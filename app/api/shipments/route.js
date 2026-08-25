import { makeListCreateHandler } from "../../../lib/crudHandlers";
import Shipment from "../../../models/Shipment";

const handlers = makeListCreateHandler(Shipment, { section: "shipping" });
export const GET = handlers.GET;
export const POST = handlers.POST;
