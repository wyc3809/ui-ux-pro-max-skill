import { useState } from "react";
import { useT } from "@/i18n";
import { Button } from "./Button";
import { Sheet } from "./Sheet";
import { Txt } from "./Txt";

type Props = { open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void | Promise<void>; onClose: () => void };

/**
 * Replaces Alert.alert for destructive confirmation (§7, §11.6). An async `onConfirm` keeps the sheet open
 * with a spinner until it finishes; if it rejects the sheet stays open so the person can retry (the caller
 * shows why).
 */
export function ConfirmSheet({ open, title, body, confirmLabel, onConfirm, onClose }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const confirm = () => {
    const r = onConfirm();
    if (!(r instanceof Promise)) return onClose();
    setBusy(true);
    r.then(onClose, () => {}).finally(() => setBusy(false));
  };
  return (
    <Sheet
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      footer={
        <>
          <Button label={confirmLabel} variant="danger" loading={busy} onPress={confirm} />
          <Button label={t("common.cancel")} variant="secondary" disabled={busy} onPress={onClose} />
        </>
      }
    >
      <Txt tone="fgMuted">{body}</Txt>
    </Sheet>
  );
}
