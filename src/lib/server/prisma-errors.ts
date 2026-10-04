import { NextResponse } from "next/server";

export interface PrismaErrorResponse {
  message: string;
  status: number;
  field?: string;
}

/**
 * Maps known Prisma error codes to appropriate HTTP status codes and user-friendly messages.
 * P2002 -> 409 Conflict (e.g. Duplicate unique slug, email)
 * P2025 -> 404 Not Found (e.g. Record not found to update/delete)
 * P2003 -> 400 Bad Request (e.g. Foreign key constraint failed)
 */
export function parsePrismaError(error: any): PrismaErrorResponse | null {
  if (!error || typeof error !== "object") return null;

  const code = error.code;
  if (!code || typeof code !== "string") return null;

  switch (code) {
    case "P2002": {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : typeof error.meta?.target === "string"
        ? error.meta.target
        : "unique field";
      return {
        status: 409,
        field: target,
        message: `A record with this ${target} already exists. Please choose a different value.`,
      };
    }
    case "P2025": {
      return {
        status: 404,
        message: "The requested record was not found.",
      };
    }
    case "P2003": {
      return {
        status: 400,
        message: "Operation failed due to a related record dependency.",
      };
    }
    default:
      return null;
  }
}

/**
 * Centralized API error handler that checks for Prisma error codes before falling back to 500.
 */
export function handleApiError(error: any, fallbackMessage = "An unexpected error occurred.") {
  const prismaError = parsePrismaError(error);
  if (prismaError) {
    return NextResponse.json(
      { message: prismaError.message, error: prismaError.message, field: prismaError.field },
      { status: prismaError.status }
    );
  }

  console.error("API_UNCAUGHT_ERROR:", error);
  return NextResponse.json(
    { message: fallbackMessage, error: error?.message || fallbackMessage },
    { status: 500 }
  );
}
