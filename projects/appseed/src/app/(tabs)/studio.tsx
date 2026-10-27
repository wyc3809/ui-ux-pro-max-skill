import { useState } from "react";
import { View } from "react-native";
import { useStudio } from "@/api/queries";
import { LargeTitleScreen } from "@/components/shell/LargeTitleScreen";
import { TabScene } from "@/components/shell/TabScene";
import { AnalyticsOverview } from "@/components/studio/AnalyticsOverview";
import { ListingChooser } from "@/components/studio/ListingChooser";
import { ListingRow } from "@/components/studio/ListingRow";
import { PayoutCard } from "@/components/studio/PayoutCard";
import { SalesChart } from "@/components/studio/SalesChart";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { RowDivider } from "@/components/ui/ListRow";
import { NumberRoll } from "@/components/ui/NumberRoll";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { requireAuth } from "@/store/authGate";

import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Reveal } from "@/components/ui/Reveal";

export default function StudioScreen() {
  const t = useT();
  const { c } = useTheme();
  const { data, refetch } = useStudio();
  const [chooser, setChooser] = useState(false);
  return (
    <TabScene index={2}>
      <LargeTitleScreen title={t("studio.title")} onRefresh={refetch}>
        <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
          {!data ? (
            <>
              <Skeleton height={190} radius={radius.card} />
              <Skeleton height={200} radius={radius.card} />
            </>
          ) : (
            <>
              <Reveal kind="card">
                <Card style={{ gap: 4 }}>
                  <Txt variant="eyebrow" tone="fgSubtle">
                    {t("studio.revenue")}
                  </Txt>
                  <NumberRoll value={data.revenue} prefix="HK$" variant="largeTitle" />
                  <View style={{ height: 16 }} />
                  <SalesChart data={data.sales} label={t("studio.last30")} />
                </Card>
              </Reveal>
              <Reveal index={1}>
                <AnalyticsOverview />
              </Reveal>
              <Section title={t("studio.myTemplates")} index={1} inset={false}>
                <Card padded={false}>
                  {data.listings.map((l, i) => (
                    <View key={l.slug}>
                      {i > 0 && <RowDivider />}
                      <ListingRow l={l} />
                    </View>
                  ))}
                </Card>
              </Section>
              <Reveal index={2} style={{ gap: 16 }}>
                <PayoutCard amount={data.payout} next={data.nextPayout} />
                <Button label={t("listing.choose")} icon={<Icon name="plus" size={19} color={c.accentFg} enterDelay={300} motion="spin" trigger={chooser} />} onPress={() => requireAuth("auth.reasonList", () => setChooser(true))} />
              </Reveal>
            </>
          )}
        </View>
        <ListingChooser open={chooser} onClose={() => setChooser(false)} />
      </LargeTitleScreen>
    </TabScene>
  );
}
