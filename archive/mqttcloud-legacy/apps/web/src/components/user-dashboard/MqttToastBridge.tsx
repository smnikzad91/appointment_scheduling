"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useMqttLive, type MqttActivityEvent } from "@/context/MqttLiveContext";
import { useT } from "@/i18n/useT";

// Renders nothing — just pops a toast for every live connect/disconnect
// event, anywhere in the user dashboard, without the current page needing to
// know about live push itself.
export default function MqttToastBridge() {
  const t = useT();

  const onEvent = useCallback((e: MqttActivityEvent) => {
    const label = e.event === "connect" ? t("eventConnect") : t("eventDisconnect");
    const message = `${e.clientName} — ${label}`;
    if (e.event === "connect") toast.success(message);
    else                       toast.warning(message);
  }, [t]);

  useMqttLive(onEvent);
  return null;
}
