"use server";

import { requireSession } from "@/lib/auth/session";
import {
  listClientAppointments,
  type AppointmentWithRefs,
} from "@/lib/db/appointments";

/**
 * Історія візитів одного клієнта — на вимогу, коли відкривають картку.
 *
 * Раніше сторінка віддавала історію всіх клієнтів одразу: на сотні клієнтів це
 * сотні кілобайт у HTML, і всі телефони з медичними нотатками лежали в розмітці
 * незалежно від того, чи їх хтось відкривав.
 */
export async function loadClientHistory(
  clientId: string,
): Promise<AppointmentWithRefs[]> {
  await requireSession();
  return listClientAppointments(clientId);
}
