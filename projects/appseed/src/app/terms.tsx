import { DetailScaffold } from "@/components/shell/DetailScaffold";
import { TermsBody } from "@/components/legal/TermsBody";
import { Reveal } from "@/components/ui/Reveal";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";

/** Terms, community rules, IP takedown and contact (§30). Linked from Me and from sign-up. */
export default function TermsScreen() {
  const t = useT();
  return (
    <DetailScaffold title={t("terms.title")}>
      <Reveal>
        <Txt variant="heroTitle" accessibilityRole="header">
          {t("terms.title")}
        </Txt>
        <Txt variant="caption" tone="fgSubtle">
          {t("terms.updated")}
        </Txt>
      </Reveal>
      <Reveal index={1}>
        <TermsBody />
      </Reveal>
    </DetailScaffold>
  );
}
