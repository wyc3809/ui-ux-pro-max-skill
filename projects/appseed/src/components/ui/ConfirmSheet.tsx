import { useT } from "@/i18n";
import { Button } from "./Button";
import { Sheet } from "./Sheet";
import { Txt } from "./Txt";

type Props = { open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void };

/** Replaces Alert.alert for destructive confirmation (§7, §11.6). */
export function ConfirmSheet({ open, title, body, confirmLabel, onConfirm, onClose }: Props) {
  const t = useT();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button
            label={confirmLabel}
            variant="danger"
            onPress={() => {
              onConfirm();
              onClose();
            }}
          />
          <Button label={t("common.cancel")} variant="secondary" onPress={onClose} />
        </>
      }
    >
      <Txt tone="fgMuted">{body}</Txt>
    </Sheet>
  );
}
