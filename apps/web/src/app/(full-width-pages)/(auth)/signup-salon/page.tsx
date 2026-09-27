import SignUpSalonForm from "@/components/auth/SignUpSalonForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ثبت‌نام سالن",
  description: "سالن زیبایی خود را رایگان در نوبتا ثبت کنید و نوبت‌دهی آنلاین را همین امروز شروع کنید.",
};

export default function SignUpSalon() {
  return <SignUpSalonForm />;
}
