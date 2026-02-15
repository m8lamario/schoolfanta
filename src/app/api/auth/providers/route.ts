import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const basePath = "/api/auth";

  const providersMap = Object.fromEntries(
    (authOptions.providers ?? []).map((provider) => {
      const id = provider.id;
      const base = {
        id,
        name: provider.name,
        type: provider.type,
        signinUrl: `${origin}${basePath}/signin/${id}`,
        callbackUrl: `${origin}${basePath}/callback/${id}`,
      } as {
        id: string;
        name: string;
        type: string;
        signinUrl: string;
        callbackUrl: string;
        credentials?: Record<string, unknown>;
      };

      if ("credentials" in provider && provider.credentials) {
        base.credentials = provider.credentials;
      }

      return [id, base];
    })
  );

  return NextResponse.json(providersMap);
}
