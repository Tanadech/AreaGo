"use client";

import { Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";

export interface AuthControlProps {
  /** Open the login dialog (owned by the parent so it can wire retries). */
  onRequestLogin: () => void;
}

/**
 * Header auth control: shows the signed-in identity + Logout when authed,
 * or a Login button otherwise. Reflects the zustand auth-store state.
 */
export function AuthControl({ onRequestLogin }: AuthControlProps) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clear = useAuthStore((s) => s.clear);

  const authed = Boolean(accessToken);

  if (authed) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {user?.name || user?.email}
        </span>
        <Button variant="outline" size="sm" onClick={() => clear()}>
          ออกจากระบบ
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={onRequestLogin}>
      เข้าสู่ระบบ
    </Button>
  );
}
