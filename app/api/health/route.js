import { NextResponse } from "next/server";
import { getAllowedOrigin, getFaucetStatus } from "../../../lib/faucet.js";

export const runtime = "nodejs";

function corsHeaders(methods) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(),
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function GET() {
  try {
    const status = await getFaucetStatus();
    return NextResponse.json(status, {
      status: 200,
      headers: corsHeaders("GET,OPTIONS"),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      {
        status: Number.isInteger(error.statusCode) ? error.statusCode : 500,
        headers: corsHeaders("GET,OPTIONS"),
      },
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders("GET,OPTIONS"),
  });
}
