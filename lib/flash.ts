import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export const flashCookie = "duba_flash";

export async function flash(message: string) {
  (await cookies()).set(
    flashCookie,
    encodeURIComponent(`${Date.now()}|${message}`),
    {
      path: "/",
      maxAge: 30,
      sameSite: "lax",
    },
  );
}

export async function done(message: string) {
  await flash(message);
  revalidatePath("/", "layout");
}
