import { makeItemHandler } from "../../../../lib/crudHandlers";
import Shipment from "../../../../models/Shipment";

const handlers = makeItemHandler(Shipment, { section: "shipping" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
