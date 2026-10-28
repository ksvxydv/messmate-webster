import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { DietaryPref } from "@/types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, dietaryPref } = body;

    if (!dietaryPref || !["VEG", "NON_VEG", "JAIN"].includes(dietaryPref)) {
      return NextResponse.json(
        { success: false, error: "Invalid dietary preference. Allowed values: VEG, NON_VEG, JAIN." },
        { status: 400 }
      );
    }

    const sessionUser = await getAuthenticatedUser(request);
    const targetUserId = userId || sessionUser?.id;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to update dietary preference." },
        { status: 401 }
      );
    }

    // 1. Update in localStore (finds by UUID or legacy_id like usr-xgmehrhaj)
    const updatedUser = localStore.updateUser(targetUserId, {
      dietary_pref: dietaryPref as DietaryPref,
    });

    // 2. Sync to Supabase if valid UUID
    if (UUID_REGEX.test(targetUserId)) {
      try {
        await supabase
          .from("users")
          .update({ dietary_pref: dietaryPref })
          .eq("id", targetUserId);
      } catch (err: any) {
        console.warn("[preference] Supabase sync skipped:", err?.message);
      }
    }

    return NextResponse.json({
      success: true,
      dietaryPref,
      user: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update dietary preference." },
      { status: 500 }
    );
  }
}
