import type { FlightState } from "../../src/types/flight";

export interface Processor {
  name: string;
  /** Process a batch of flights. Called every tick (~15s). */
  process(flights: FlightState[], tickCount: number): Promise<void>;
}
