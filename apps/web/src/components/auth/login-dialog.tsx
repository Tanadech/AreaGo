"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Button, FieldError, Input, Label, Modal } from "@/components/ui";
import { ApiError, getMe, login } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export interface LoginDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Close the dialog without logging in. */
  onClose: () => void;
  /**
   * Called after a successful login (token stored in the auth store). Use this
   * to retry the action that triggered the login (e.g. saving a place).
   */
  onSuccess?: () => void;
}

/**
 * Minimal email/password login dialog built from the design-system primitives.
 *
 * On submit it calls POST /auth/login, stores the access token + user in the
 * auth store, then fires `onSuccess` (typically a retry of the gated action).
 * Backend-reported errors surface inline via the API error envelope.
 */
export function LoginDialog({ open, onClose, onSuccess }: LoginDialogProps) {
  const setAuth = useAuthStore((s) => s.setAuth);

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const { access_token } = await login({ email, password });
      // Persist the token first so the follow-up /auth/me request is authed.
      setAuth({
        accessToken: access_token,
        user: { id: "", email, name: undefined },
      });

      // Best-effort profile hydration; a failure here shouldn't block login.
      try {
        const me = await getMe();
        setAuth({
          accessToken: access_token,
          user: {
            id: me.id,
            email: me.email,
            name: me.display_name ?? undefined,
          },
        });
      } catch {
        // Keep the minimal user we already stored.
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
            : err.message,
        );
      } else {
        setError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
      }
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="เข้าสู่ระบบ"
      description="เข้าสู่ระบบเพื่อบันทึกสถานที่ลงในบัญชีของคุณ"
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={emailId} required>
            อีเมล
          </Label>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={passwordId} required>
            รหัสผ่าน
          </Label>
          <Input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            placeholder="••••••••"
          />
        </div>

        <FieldError id={errorId}>{error}</FieldError>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={submitting} disabled={!email || !password}>
            เข้าสู่ระบบ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
