import { Redirect, useLocalSearchParams } from "expo-router";

/** Short share link (t/slug, lib/links.ts): the same URL on the web, iOS and Android lands on the full page. */
export default function Short() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <Redirect href={`/template/${slug}`} />;
}
