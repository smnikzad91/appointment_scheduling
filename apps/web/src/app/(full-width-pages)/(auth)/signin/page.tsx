import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ورود",
  description: "برای ورود به حساب نوبتا ایمیل یا شماره موبایل و رمز عبور خود را وارد کنید.",
};

export default function SignIn() {
  return <SignInForm />;
}
