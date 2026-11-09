"use client";

import { useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { removeAvatarRequest, updateProfileRequest, uploadAvatarRequest } from "@/lib/auth-api";
import { useStore } from "@/lib/store";

export default function AdminProfilePage() {
  const { t, profile, setProfile, refreshMe } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
  }, [profile.name, profile.email, profile.phone]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const response = await uploadAvatarRequest(file);
      setProfile({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone ?? "",
        avatar: response.data.avatar ?? "",
      });
      await refreshMe();
      setSaved(t({ de: "Foto gespeichert.", en: "Photo saved." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Upload fehlgeschlagen.", en: "Upload failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setBusy(true);
    setError("");
    try {
      const response = await removeAvatarRequest();
      setProfile({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone ?? "",
        avatar: "",
      });
      setSaved(t({ de: "Foto entfernt.", en: "Photo removed." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Entfernen fehlgeschlagen.", en: "Remove failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await updateProfileRequest({ name, email, phone });
      setProfile({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone ?? "",
        avatar: response.data.avatar ?? "",
      });
      setSaved(t({ de: "Gespeichert.", en: "Saved." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Speichern fehlgeschlagen.", en: "Save failed." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Profil", en: "Profile" })}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">{t({ de: "Name, Kontakt und Profilbild — gespeichert über Sanctum API.", en: "Name, contact, and photo — saved through the Sanctum API." })}</p>

      <form onSubmit={save} className="mt-8 grid max-w-2xl gap-6 lg:grid-cols-[180px_1fr]">
        <div className="space-y-3">
          <div className="grid aspect-square place-items-center overflow-hidden rounded-3xl border border-line bg-paper">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="bg-accent-gradient grid h-20 w-20 place-items-center rounded-full text-2xl font-semibold text-white">
                {(name || "A").slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
          <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={() => inputRef.current?.click()}>
            {t({ de: "Foto hochladen", en: "Upload photo" })}
          </Button>
          {profile.avatar ? (
            <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={removePhoto}>
              {t({ de: "Foto entfernen", en: "Remove photo" })}
            </Button>
          ) : null}
        </div>

        <div className="space-y-4 rounded-3xl border border-line bg-white p-5">
          <Field label={t({ de: "Name", en: "Name" })}>
            <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label={t({ de: "E-Mail", en: "Email" })}>
            <input type="email" className={fieldClass} value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label={t({ de: "Telefon", en: "Phone" })}>
            <input className={fieldClass} value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>{t({ de: "Speichern", en: "Save" })}</Button>
            {saved ? <span className="text-sm text-ok">{saved}</span> : null}
          </div>
        </div>
      </form>
    </AdminShell>
  );
}
