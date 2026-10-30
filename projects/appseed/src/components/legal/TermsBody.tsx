import { View } from "react-native";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import { IP_EMAIL, SUPPORT_EMAIL } from "@/lib/contact";
import { gap } from "@/theme/tokens";
import { FeesSection } from "./FeesSection";

const SECTIONS: { title: TKey; body: TKey[] }[] = [
  { title: "terms.communityTitle", body: ["terms.community1", "terms.community2", "terms.community3"] },
  { title: "terms.ipTitle", body: ["terms.ip1", "terms.ip2"] },
  { title: "terms.payTitle", body: ["terms.pay1", "terms.pay2"] },
  { title: "terms.privacyTitle", body: ["terms.privacy1"] },
  { title: "terms.contactTitle", body: ["terms.contact1"] },
];

/** The terms in plain language; shared by the terms screen and the sign-up sheet. */
export function TermsBody({ feesOpen }: { feesOpen?: boolean } = {}) {
  const t = useT();
  return (
    <View style={{ gap: gap.xl }}>
      {SECTIONS.map((s) => (
        <View key={s.title} style={{ gap: gap.sm }}>
          <Txt variant="bodyStrong">{t(s.title)}</Txt>
          {s.body.map((b) => (
            <Txt key={b} tone="fgMuted">
              {t(b, { email: b === "terms.ip2" ? IP_EMAIL : SUPPORT_EMAIL })}
            </Txt>
          ))}
        </View>
      ))}
      <FeesSection open={feesOpen} />
    </View>
  );
}
