import { NextResponse } from "next/server";
import { getAllowedOrigin, getPublicConfig } from "../../../lib/faucet.js";

export const runtime = "nodejs";

function corsHeaders(methods) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(),
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      ...getPublicConfig(),
    },
    {
      status: 200,
      headers: corsHeaders("GET,OPTIONS"),
    },
  );
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders("GET,OPTIONS"),
  });
}
