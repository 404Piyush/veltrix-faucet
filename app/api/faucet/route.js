import { NextResponse } from "next/server";
import { getAllowedOrigin, handleDripRequest } from "../../../lib/faucet.js";

export const runtime = "nodejs";

function corsHeaders(methods) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(),
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders("POST,OPTIONS"),
  });
}

export async function POST(request) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await handleDripRequest({
      address: body?.address,
      ip: clientIp,
      turnstileToken: body?.turnstileToken || body?.cfTurnstileToken || body?.["cf-turnstile-response"],
    });

    return NextResponse.json(result, {
      status: 200,
      headers: corsHeaders("POST,OPTIONS"),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      {
        status: Number.isInteger(error.statusCode) ? error.statusCode : 500,
        headers: corsHeaders("POST,OPTIONS"),
      },
    );
  }
}
