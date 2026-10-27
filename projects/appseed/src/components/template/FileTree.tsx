import { useState } from "react";
import { View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, withTiming } from "react-native-reanimated";
import type { FileNode } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Txt } from "@/components/ui/Txt";
import { formatBytes } from "@/lib/format";
import { rowIn, rowOut } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radius } from "@/theme/tokens";

/** Read-only tree: names and sizes only, never file contents (§7). Folders rotate their chevron and rows slide in. */
export function FileTree({ nodes }: { nodes: FileNode[] }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.bgCode, borderRadius: radius.inset, paddingVertical: 8, borderWidth: 1, borderColor: c.border }}>
      {nodes.map((n) => (
        <Node key={n.name} node={n} depth={0} defaultOpen={n.name === "app"} />
      ))}
    </View>
  );
}

function Node({ node, depth, defaultOpen = false }: { node: FileNode; depth: number; defaultOpen?: boolean }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const isDir = !!node.children;
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? "90deg" : "0deg", { duration: 200, easing: motion.rowIn.easing, reduceMotion: ReduceMotion.System }) }],
  }));
  const row = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 34, paddingLeft: 12 + depth * 16, paddingRight: 12 }}>
      {isDir ? (
        <Animated.View style={chevron}>
          <Icon name="chevronRight" size={14} color={c.fgSubtle} enter={false} />
        </Animated.View>
      ) : (
        <View style={{ width: 14 }} />
      )}
      {/* Folders fill in when opened. */}
      {isDir ? <Icon name="folder" size={15} color={c.accent} active={open} motion="bounce" /> : <Icon name="file" size={15} color={c.fgSubtle} />}
      <Txt variant="code" style={{ flex: 1 }} numberOfLines={1}>
        {node.name}
      </Txt>
      {node.size != null && (
        <Txt variant="caption" tone="fgSubtle" tabular>
          {formatBytes(node.size)}
        </Txt>
      )}
    </View>
  );
  return (
    <View>
      {isDir ? (
        <PressableScale scaleTo={0.99} hapticKind="selection" accessibilityState={{ expanded: open }} accessibilityLabel={node.name} onPress={() => setOpen((o) => !o)}>
          {row}
        </PressableScale>
      ) : (
        row
      )}
      {isDir && open && (
        <Animated.View entering={rowIn} exiting={rowOut}>
          {node.children!.map((ch) => (
            <Node key={ch.name} node={ch} depth={depth + 1} />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

export function countFiles(nodes: FileNode[]): { files: number; bytes: number } {
  return nodes.reduce(
    (acc, n) => {
      if (n.children) {
        const sub = countFiles(n.children);
        return { files: acc.files + sub.files, bytes: acc.bytes + sub.bytes };
      }
      return { files: acc.files + 1, bytes: acc.bytes + (n.size ?? 0) };
    },
    { files: 0, bytes: 0 },
  );
}
