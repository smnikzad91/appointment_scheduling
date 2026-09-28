import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ورود",
  description: "ورود به حساب نوبتا با کد پیامکی یا رمز عبور.",
};

export default function SignIn() {
  return <SignInForm />;
}
