"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { Modal } from "@/components/ui/modal";

function MqttSubNav() {
  const t        = useT();
  const pathname = usePathname();
  const tabs = [
    { href: "/dashboard/mqtt",          label: t("linkOverview") },
    { href: "/dashboard/mqtt/activity", label: t("mqttTabActivity") },
    { href: "/dashboard/mqtt/messages", label: t("mqttTabMessages") },
  ];
  return (
    <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
      {tabs.map((tb) => {
        const active = pathname === tb.href;
        return (
          <Link
            key={tb.href}
            href={tb.href}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tb.label}
          </Link>
        );
      })}
    </div>
  );
}

type Credential = {
  id: string;
  username: string;
  isActive: boolean;
  maxConnection: number;
  createdAt: string;
};

type Client = {
  id: string;
  clientName: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  credential: { id: string; username: string } | null;
};

const MQTT_HOST      = process.env.NEXT_PUBLIC_MQTT_HOST ?? "mqtt.mqttcloud.ir";
const MQTT_PORT_TCP  = process.env.NEXT_PUBLIC_MQTT_PORT_TCP ?? "1883";
const MQTT_PORT_TLS  = process.env.NEXT_PUBLIC_MQTT_PORT_TLS ?? "8883";

function StatusDot({ on }: { on: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${on ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span dir="ltr" className="font-mono text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          className="shrink-0 text-gray-400 hover:text-brand-500 transition-colors"
          aria-label="Copy"
        >
          {copied
            ? <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          }
        </button>
      </div>
    </div>
  );
}

export default function UserMqttPage() {
  const t        = useT();
  const { lang } = useLanguage();
  const isRTL    = lang === "fa";

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [clients, setClients]         = useState<Client[]>([]);
  const [loading, setLoading]         = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/user/mqtt/credentials").then((r) => r.json()),
      fetch("/api/user/mqtt/clients").then((r) => r.json()),
    ])
      .then(([c, cl]) => {
        setCredentials(Array.isArray(c) ? c : []);
        setClients(Array.isArray(cl) ? cl : []);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { queueMicrotask(load); }, []);

  // ── Credential modal ──────────────────────────────────────────────────
  const [showCredModal, setShowCredModal] = useState(false);
  const [credUsername, setCredUsername]   = useState("");
  const [credPassword, setCredPassword]   = useState("");
  const [savingCred, setSavingCred]       = useState(false);

  const openCredModal = () => { setCredUsername(""); setCredPassword(""); setShowCredModal(true); };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCred(true);
    const res  = await fetch("/api/user/mqtt/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: credUsername, password: credPassword }),
    });
    const data = await res.json();
    setSavingCred(false);
    if (res.ok) { toast.success(t("mqttCredentialAdded")); setShowCredModal(false); load(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  const handleToggleActive = async (cred: Credential) => {
    const res = await fetch(`/api/user/mqtt/credentials/${cred.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cred.isActive }),
    });
    if (res.ok) load();
    else        { const d = await res.json(); toast.error(d.error || t("saveError")); }
  };

  const handleDeleteCredential = async (id: string) => {
    const res  = await fetch(`/api/user/mqtt/credentials/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) { toast.success(t("mqttCredentialDeleted")); load(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  // ── Regenerate password modal ────────────────────────────────────────
  const [regenId, setRegenId]         = useState<string | null>(null);
  const [regenPassword, setRegenPassword] = useState("");
  const [regenerating, setRegenerating]   = useState(false);

  const handleRegenerate = async () => {
    if (!regenId) return;
    setRegenerating(true);
    const res  = await fetch(`/api/user/mqtt/credentials/${regenId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: regenPassword }),
    });
    const data = await res.json();
    setRegenerating(false);
    if (res.ok) { toast.success(t("mqttPasswordRegenerated")); setRegenId(null); }
    else        { toast.error(data.error || t("saveError")); }
  };

  // ── Client modal ──────────────────────────────────────────────────────
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientCredId, setClientCredId]       = useState("");
  const [clientName, setClientName]           = useState("");
  const [savingClient, setSavingClient]       = useState(false);

  const openClientModal = () => {
    if (credentials.length === 0) { toast.error(t("noMqttCredentials")); return; }
    setClientCredId(credentials[0].id); setClientName(""); setShowClientModal(true);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClient(true);
    const res  = await fetch("/api/user/mqtt/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mqttUserId: clientCredId, clientName }),
    });
    const data = await res.json();
    setSavingClient(false);
    if (res.ok) { toast.success(t("mqttClientAdded")); setShowClientModal(false); load(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  const handleDeleteClient = async (id: string) => {
    const res  = await fetch(`/api/user/mqtt/clients/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) { toast.success(t("mqttClientDeleted")); load(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  const formatDate = (v: string | null) =>
    v ? new Date(v).toLocaleString(isRTL ? "fa-IR" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : t("mqttNeverSeen");

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("mqttDashboardTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("mqttDashboardDesc")}</p>
      </div>

      <MqttSubNav />

      {/* Connection info */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("mqttConnectionInfo")}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("mqttConnectionInfoDesc")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InfoField label={t("mqttHost")} value={MQTT_HOST} />
          <InfoField label={t("mqttPortPlain")} value={MQTT_PORT_TCP} />
          <InfoField label={t("mqttPortTls")} value={MQTT_PORT_TLS} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t("mqttTopicHint")}</p>
      </div>

      {/* Credentials */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("mqttCredentials")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("mqttCredentialsDesc")}</p>
          </div>
          <button
            onClick={openCredModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            {t("addMqttCredential")}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">{t("loading")}</p>
        ) : credentials.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("noMqttCredentials")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {credentials.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800 first:border-t-0">
                    <td className="py-2.5 pe-4">
                      <span dir="ltr" className="font-mono font-medium text-gray-900 dark:text-white">{c.username}</span>
                    </td>
                    <td className="py-2.5 pe-4">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          c.isActive
                            ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {c.isActive ? t("mqttActive") : t("mqttSuspended")}
                      </button>
                    </td>
                    <td className="py-2.5 pe-4 text-gray-500 dark:text-gray-400">{c.maxConnection} {t("mqttClients")}</td>
                    <td className="py-2.5 text-end">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => { setRegenId(c.id); setRegenPassword(""); }}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          {t("regeneratePassword")}
                        </button>
                        <button
                          onClick={() => handleDeleteCredential(c.id)}
                          className="rounded-lg bg-red-400 hover:bg-red-500 p-1.5 text-white transition-colors"
                          aria-label={t("delete")}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Devices */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("mqttClients")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("mqttClientsDesc")}</p>
          </div>
          <button
            onClick={openClientModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            {t("addMqttClient")}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">{t("loading")}</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("noMqttClients")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {clients.map((cl) => (
                  <tr key={cl.id} className="border-t border-gray-100 dark:border-gray-800 first:border-t-0">
                    <td className="py-2.5 pe-4">
                      <div className="flex items-center gap-2">
                        <StatusDot on={cl.isOnline} />
                        <span dir="ltr" className="font-mono font-medium text-gray-900 dark:text-white">{cl.clientName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pe-4 text-gray-500 dark:text-gray-400" dir="ltr">{cl.credential?.username ?? "—"}</td>
                    <td className="py-2.5 pe-4 text-gray-500 dark:text-gray-400">{cl.isOnline ? t("mqttOnline") : t("mqttOffline")}</td>
                    <td className="py-2.5 pe-4 text-gray-500 dark:text-gray-400" dir="ltr">{formatDate(cl.lastSeenAt)}</td>
                    <td className="py-2.5 text-end">
                      <button
                        onClick={() => handleDeleteClient(cl.id)}
                        className="rounded-lg bg-red-400 hover:bg-red-500 p-1.5 text-white transition-colors"
                        aria-label={t("delete")}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add credential modal */}
      <Modal isOpen={showCredModal} onClose={() => !savingCred && setShowCredModal(false)} className="max-w-md mx-4 w-full" showCloseButton={false}>
        <form onSubmit={handleAddCredential} dir={isRTL ? "rtl" : "ltr"} className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("addMqttCredential")}</h2>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("mqttUsername")}</label>
            <input
              dir="ltr"
              value={credUsername}
              onChange={(e) => setCredUsername(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-400">{t("mqttUsernameHint")}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("mqttPassword")}</label>
            <input
              dir="ltr"
              type="password"
              value={credPassword}
              onChange={(e) => setCredPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-400">{t("mqttPasswordHint")}</p>
          </div>
          <div className={`flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button type="submit" disabled={savingCred} className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
              {savingCred ? t("submitting") : t("addMqttCredential")}
            </button>
            <button type="button" onClick={() => !savingCred && setShowCredModal(false)} disabled={savingCred} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
              {t("cancel")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Regenerate password modal */}
      <Modal isOpen={!!regenId} onClose={() => !regenerating && setRegenId(null)} className="max-w-md mx-4 w-full" showCloseButton={false}>
        <div dir={isRTL ? "rtl" : "ltr"} className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("regeneratePassword")}</h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("newPassword")}</label>
            <input
              dir="ltr"
              type="password"
              value={regenPassword}
              onChange={(e) => setRegenPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-400">{t("mqttPasswordHint")}</p>
          </div>
          <div className={`flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button onClick={handleRegenerate} disabled={regenerating || regenPassword.length < 6} className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
              {regenerating ? t("submitting") : t("regeneratePassword")}
            </button>
            <button onClick={() => !regenerating && setRegenId(null)} disabled={regenerating} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
              {t("cancel")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add device modal */}
      <Modal isOpen={showClientModal} onClose={() => !savingClient && setShowClientModal(false)} className="max-w-md mx-4 w-full" showCloseButton={false}>
        <form onSubmit={handleAddClient} dir={isRTL ? "rtl" : "ltr"} className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("addMqttClient")}</h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("selectCredential")}</label>
            <select
              value={clientCredId}
              onChange={(e) => setClientCredId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 transition-colors"
            >
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>{c.username}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("mqttClientName")}</label>
            <input
              dir="ltr"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-400">{t("mqttClientNameHint")}</p>
          </div>
          <div className={`flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button type="submit" disabled={savingClient} className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
              {savingClient ? t("submitting") : t("addMqttClient")}
            </button>
            <button type="button" onClick={() => !savingClient && setShowClientModal(false)} disabled={savingClient} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
              {t("cancel")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
