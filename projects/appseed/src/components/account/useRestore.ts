import { useRestorePurchases } from "@/api/queries";
import { toast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { requireAuth } from "@/store/authGate";

/**
 * "Restore purchases" (App Review 3.1.1). Purchases belong to the account, so restoring signs in if needed,
 * syncs the store's receipts and re-reads what the server says this account owns; it never grants anything
 * on the client.
 */
export function useRestore() {
  const t = useT();
  const restore = useRestorePurchases();
  const run = () =>
    requireAuth("auth.reasonRestore", () =>
      restore.mutate(undefined, {
        onSuccess: ({ templates, prompts }) => {
          const n = templates + prompts;
          haptic(n ? "success" : "tap");
          toast(n ? t("me.restored", { n }) : t("me.restoreNone"));
        },
        onError: () => toast(t("me.restoreFailed"), "warning"),
      }),
    );
  return { run, pending: restore.isPending };
}
