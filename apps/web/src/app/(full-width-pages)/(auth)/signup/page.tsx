import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ثبت‌نام",
  description: "در نوبتت حساب بسازید و نوبت‌های سالن‌های زیبایی را آنلاین رزرو و پیگیری کنید.",
};

export default function SignUp() {
  return <SignUpForm />;
}
