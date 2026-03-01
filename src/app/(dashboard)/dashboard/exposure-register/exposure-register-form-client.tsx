"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ExposureRegisterForm } from "./exposure-register-form";

const ExposureRegisterFormDynamic = dynamic(
  () => import("./exposure-register-form").then((m) => m.ExposureRegisterForm),
  { ssr: false, loading: () => <div className="py-12 text-center text-sm text-muted-foreground">Laster skjema...</div> }
);

export function ExposureRegisterFormClient(props: ComponentProps<typeof ExposureRegisterForm>) {
  return <ExposureRegisterFormDynamic {...props} />;
}
