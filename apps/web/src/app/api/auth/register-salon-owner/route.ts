import { NextRequest, NextResponse } from "next/server";
import { apiRegisterSalonOwner } from "@/lib/apiAuth";
import { ApiError } from "@/lib/apiClient";
import { persianApiError } from "@/lib/api/errorMessages";
import { logError } from "@/lib/errorLog";

const IRANIAN_MOBILE = /^09[0-9]{9}$/;

export async function POST(req: NextRequest) {
  try {
    const {
      firstName, lastName, email, phone, password, salonName, province, city, address, latitude, longitude, planId,
      kind, serviceLocations, serviceArea, hostSalonName,
    } = await req.json();
    // kind INDEPENDENT = an independent stylist signing up their own business (apps/api validates the rest).
    const independent = kind === "INDEPENDENT";

    if (!firstName || !lastName || !phone || !password || !salonName || !province || !city || !address) {
      return NextResponse.json({ error: "همه فیلدها الزامی هستند" }, { status: 400 });
    }

    if (!IRANIAN_MOBILE.test(phone)) {
      return NextResponse.json(
        { error: "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد (مثال: ۰۹۱۱۹۱۰۰۹۹۱)" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "رمز عبور باید حداقل ۸ کاراکتر باشد" }, { status: 400 });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "محل سالن را روی نقشه مشخص کنید" }, { status: 400 });
    }

    await apiRegisterSalonOwner({
      firstName, lastName, email, phone, password, salonName, province, city, address, latitude, longitude,
      planId: typeof planId === "string" && planId ? planId : undefined,
      ...(independent && {
        kind: "INDEPENDENT" as const,
        serviceLocations: Array.isArray(serviceLocations) ? serviceLocations : [],
        serviceArea: typeof serviceArea === "string" ? serviceArea : undefined,
        hostSalonName: typeof hostSalonName === "string" ? hostSalonName : undefined,
      }),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const message = err.message.toLowerCase().includes("email")
        ? "این ایمیل قبلاً ثبت شده است"
        : "این شماره موبایل قبلاً ثبت شده است";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (err instanceof ApiError && err.status === 400) {
      return NextResponse.json({ error: persianApiError(err) }, { status: 400 });
    }

    await logError({ error: err, method: "POST", path: "/api/auth/register-salon-owner", statusCode: 500 });
    return NextResponse.json({ error: "خطای سرور. لطفاً دوباره تلاش کنید" }, { status: 500 });
  }
}
