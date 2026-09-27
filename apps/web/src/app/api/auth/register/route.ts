import { NextRequest, NextResponse } from "next/server";
import { apiRegister } from "@/lib/apiAuth";
import { ApiError } from "@/lib/apiClient";
import { logError } from "@/lib/errorLog";

const IRANIAN_MOBILE = /^09[0-9]{9}$/;

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password } = await req.json();

    if (!firstName || !lastName || !email || !phone || !password) {
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

    await apiRegister({ firstName, lastName, email, phone, password });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const message = err.message.toLowerCase().includes("email")
        ? "این ایمیل قبلاً ثبت شده است"
        : "این شماره موبایل قبلاً ثبت شده است";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (err instanceof ApiError && err.status === 400) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    await logError({ error: err, method: "POST", path: "/api/auth/register", statusCode: 500 });
    return NextResponse.json({ error: "خطای سرور. لطفاً دوباره تلاش کنید" }, { status: 500 });
  }
}
