import { signIn } from "next-auth/react";
export async function forgotPassword(email: string) {
  const res = await fetch("/api/auth/forgot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || "Failed to send reset link");
  }

  return res.json();
}

export async function signInWithCredentials(email: string, password: string) {
  const result = await signIn("credentials", {
    redirect: false,
    email,
    password,
  });

  if (result?.error) {
    throw new Error(result.error);
  }

  return result;
}

export async function registerUser(
  data: Record<"name" | "email" | "password", string>,
) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(
      responseData.message || "Algo salió mal durante el registro.",
    );
  }

  return responseData;
}

export async function deleteAccountWithCredentials(
  data: Record<"email" | "password", string>,
) {
  const res = await fetch("/api/users/delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const responseData = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(responseData.message || "No se pudo eliminar la cuenta.");
  }

  return responseData;
}
