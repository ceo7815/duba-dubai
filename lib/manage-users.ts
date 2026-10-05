type FunctionResult = { ok: true } | { error: string };

export async function manageUsers(
  body: Record<string, string>,
  token?: string,
): Promise<FunctionResult> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${token || key}`,
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    ok?: boolean;
  } | null;

  if (!response.ok || !payload?.ok) {
    return { error: payload?.error || "לא הצלחנו לשמור" };
  }

  return { ok: true };
}
