import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ثبت‌نام",
  description: "همین الان حساب رایگان mqttcloud.ir بسازید و بروکر MQTT خود را راه‌اندازی کنید.",
};

export default function SignUp() {
  return <SignUpForm />;
}
