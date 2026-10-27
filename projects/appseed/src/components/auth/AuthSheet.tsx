import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { api, DEMO_OTP } from "@/api/mockServer";
import type { AuthResult, User } from "@/api/types";
import { Field } from "@/components/studio/FormFields";
import { Button } from "@/components/ui/Button";
import { DirectionalSwap } from "@/components/ui/DirectionalSwap";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { signInWithApple } from "@/lib/appleSignIn";
import { isValidEmail, resendIn, suggestHandle, validateHandle, type HandleError } from "@/lib/auth";
import { haptic } from "@/lib/haptic";
import { useAuthGate } from "@/store/authGate";
import { useSession } from "@/store/session";

import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { OtpInput } from "./OtpInput";
import { ProviderButton } from "./ProviderButton";
import { Reveal } from "@/components/ui/Reveal";

type Step = "choose" | "code" | "profile" | "done";
const STEPS: Step[] = ["choose", "code", "profile", "done"];

/**
 * The one sign-in / sign-up surface (§11.2): a Sheet opened from anywhere an action needs an account.
 * Apple · Google · email code → (new accounts) name + username → welcome, then the original action resumes.
 */
export function AuthSheet() {
  const { c } = useTheme();
  const t = useT();
  const { open, reason, close, finish } = useAuthGate();
  const signIn = useSession((s) => s.signIn);
  const [step, setStep] = useState<Step>("choose");
  const [busy, setBusy] = useState<"apple" | "google" | "email" | "code" | "profile" | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [ticket, setTicket] = useState<Extract<AuthResult, { status: "needsProfile" }> | null>(null);
  const [welcome, setWelcome] = useState<{ user: User; returning: boolean } | null>(null);

  useEffect(() => {
    if (open) {
      setStep("choose");
      setBusy(null);
      setEmailError(false);
    }
  }, [open]);

  const land = (r: AuthResult) => {
    if (r.status === "signedIn") {
      signIn(r.user);
      setWelcome({ user: r.user, returning: true });
      setStep("done");
    } else {
      setTicket(r);
      setStep("profile");
    }
  };
  const fail = () => {
    setBusy(null);
    toast(t("auth.failed"), "warning");
  };

  const apple = async () => {
    setBusy("apple");
    try {
      const cred = await signInWithApple();
      if (!cred) return setBusy(null); // cancelled: stay quiet
      land(await api.signInWithApple(cred));
    } catch {
      fail();
    }
  };
  const google = async () => {
    setBusy("google");
    try {
      land(await api.signInWithGoogle());
    } catch {
      fail();
    }
  };
  const sendCode = async () => {
    if (!isValidEmail(email)) {
      haptic("warning");
      setEmailError(true);
      return;
    }
    setBusy("email");
    try {
      const r = await api.sendEmailCode(email);
      setEmail(r.email);
      setSentAt(r.sentAt);
      setBusy(null);
      setStep("code");
    } catch {
      fail();
    }
  };

  useEffect(() => {
    if (step !== "done" || !welcome) return;
    haptic("success");
    const id = setTimeout(() => {
      toast(t(welcome.returning ? "auth.welcomeBack" : "auth.welcome", { name: welcome.user.name }));
      finish();
    }, 1300);
    return () => clearTimeout(id);
  }, [step, welcome, finish, t]);

  const title = step === "choose" ? t("auth.title") : step === "code" ? t("auth.codeTitle") : step === "profile" ? t("auth.profileTitle") : undefined;

  return (
    <Sheet open={open} onClose={close} title={title}>
      <DirectionalSwap value={step} order={STEPS}>
        {step === "choose" && (
          <View style={{ gap: 12 }}>
            <Txt tone="fgMuted">{reason ? t(reason) : t("auth.subtitle")}</Txt>
            <ProviderButton provider="apple" index={0} label={t("auth.apple")} loading={busy === "apple"} disabled={!!busy} onPress={apple} />
            <ProviderButton provider="google" index={1} label={t("auth.google")} loading={busy === "google"} disabled={!!busy} onPress={google} />
            <OrDivider label={t("auth.or")} />
            <Field
              inSheet
              label={t("auth.email")}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setEmailError(false);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={sendCode}
              hint={emailError ? t("auth.emailInvalid") : undefined}
            />
            <Button label={t("auth.emailContinue")} variant="secondary" loading={busy === "email"} disabled={!!busy && busy !== "email"} icon={<Icon name="mail" size={18} color={c.fg} motion="wiggle" trigger={emailError} />} onPress={sendCode} />
            <Txt variant="caption" tone="fgSubtle" style={{ textAlign: "center" }}>
              {t("auth.terms")}
            </Txt>
          </View>
        )}
        {step === "code" && <CodeStep email={email} sentAt={sentAt} onResent={setSentAt} onBack={() => setStep("choose")} onLanded={land} />}
        {step === "profile" && ticket && (
          <ProfileStep
            ticket={ticket}
            onCreated={(user) => {
              signIn(user);
              setWelcome({ user, returning: false });
              setStep("done");
            }}
          />
        )}
        {step === "done" && welcome && <DoneStep name={welcome.user.name} returning={welcome.returning} />}
      </DirectionalSwap>
    </Sheet>
  );
}

function OrDivider({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      <Txt variant="caption" tone="fgSubtle">
        {label}
      </Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
    </View>
  );
}

function CodeStep({ email, sentAt, onResent, onBack, onLanded }: { email: string; sentAt: number; onResent: (n: number) => void; onBack: () => void; onLanded: (r: AuthResult) => void }) {
  const { c } = useTheme();
  const t = useT();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [errorKey, setErrorKey] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = resendIn(sentAt, now);

  const verify = async (v: string) => {
    setVerifying(true);
    try {
      onLanded(await api.verifyEmailCode({ email, code: v }));
    } catch {
      haptic("warning");
      setError(true);
      setErrorKey((k) => k + 1);
      setVerifying(false);
      setTimeout(() => setCode(""), 450);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Txt tone="fgMuted">{t("auth.codeBody", { email })}</Txt>
      <OtpInput
        label={t("auth.codeTitle")}
        value={code}
        onChange={(v) => {
          setCode(v);
          if (error) setError(false);
        }}
        onComplete={verify}
        error={error}
        errorKey={errorKey}
      />
      <View style={{ minHeight: 22, alignItems: "center" }}>
        {verifying ? (
          <Icon name="refresh" size={18} color={c.accent} loop="spin" />
        ) : error ? (
          <Reveal>
            <Txt tone="danger">{t("auth.codeWrong")}</Txt>
          </Reveal>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <PressableScale onPress={onBack} hitSlop={8}>
          <Txt variant="bodyStrong" tone="accent">
            {t("auth.changeEmail")}
          </Txt>
        </PressableScale>
        <PressableScale
          disabled={left > 0}
          hitSlop={8}
          onPress={async () => {
            const r = await api.sendEmailCode(email);
            onResent(r.sentAt);
            toast(t("auth.resent"));
          }}
        >
          <Txt variant="bodyStrong" tone={left > 0 ? "fgSubtle" : "accent"} tabular>
            {left > 0 ? t("auth.resendIn", { s: left }) : t("auth.resend")}
          </Txt>
        </PressableScale>
      </View>
      <View style={{ padding: 10, borderRadius: radius.control, backgroundColor: c.pendingSoft }}>
        <Txt variant="caption" style={{ textAlign: "center" }}>
          {t("auth.demoCode", { code: DEMO_OTP })}
        </Txt>
      </View>
    </View>
  );
}

function ProfileStep({ ticket, onCreated }: { ticket: Extract<AuthResult, { status: "needsProfile" }>; onCreated: (u: User) => void }) {
  const { c } = useTheme();
  const t = useT();
  const [name, setName] = useState(ticket.name);
  const [handle, setHandle] = useState(suggestHandle(ticket.name, ticket.email));
  const [availability, setAvailability] = useState<"checking" | "available" | "taken" | null>(null);
  const [creating, setCreating] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const formatError: HandleError | null = validateHandle(handle);

  useEffect(() => {
    if (formatError) {
      setAvailability(null);
      return;
    }
    setAvailability("checking");
    let live = true;
    const id = setTimeout(async () => {
      const r = await api.checkHandle(handle);
      if (live) setAvailability(r.available ? "available" : "taken");
    }, 350);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [handle, formatError]);

  const ready = name.trim().length > 0 && !formatError && availability === "available";
  const create = async () => {
    if (!ready) {
      haptic("warning");
      setShakeKey((k) => k + 1);
      return;
    }
    setCreating(true);
    try {
      onCreated(await api.completeProfile({ ticket: ticket.ticket, name, handle }));
    } catch {
      setCreating(false);
      toast(t("auth.failed"), "warning");
    }
  };

  const status =
    formatError != null
      ? { tone: "danger" as const, icon: "alert" as const, label: t(`auth.${formatError}`) }
      : availability === "checking"
        ? { tone: "fgSubtle" as const, icon: "clock" as const, label: t("auth.checking") }
        : availability === "taken"
          ? { tone: "danger" as const, icon: "closeCircle" as const, label: t("auth.handleTaken") }
          : availability === "available"
            ? { tone: "live" as const, icon: "checkCircle" as const, label: t("auth.handleAvailable") }
            : null;

  return (
    <View style={{ gap: 14 }}>
      <Txt tone="fgMuted">{t("auth.profileBody")}</Txt>
      {ticket.email && (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: 10, borderRadius: radius.control, backgroundColor: c.bgMuted }}>
          <Icon name="mail" size={16} color={c.fgMuted} />
          <Txt variant="caption" style={{ flex: 1 }} numberOfLines={1}>
            {ticket.email}
          </Txt>
          {/privaterelay\.appleid\.com$/.test(ticket.email) && (
            <Txt variant="caption" tone="fgSubtle">
              {t("auth.relay")}
            </Txt>
          )}
        </View>
      )}
      <Field inSheet label={t("auth.name")} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
      <Field inSheet label={t("auth.handle")} value={handle} onChangeText={(v) => setHandle(v.toLowerCase().replace(/\s/g, ""))} autoCapitalize="none" autoCorrect={false} />
      {status && (
        <Reveal key={status.label} style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: -6 }}>
          <Icon name={status.icon} size={15} color={c[status.tone]} active loop={availability === "checking" && !formatError ? "breathe" : undefined} />
          <Txt variant="caption" tone={status.tone}>
            @{handle} · {status.label}
          </Txt>
        </Reveal>
      )}
      <ShakeView shakeKey={shakeKey}>
        <Button label={t("auth.create")} loading={creating} onPress={create} />
      </ShakeView>
    </View>
  );
}

function ShakeView({ shakeKey, children }: { shakeKey: number; children: React.ReactNode }) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (!shakeKey) return;
    const d = { duration: 50, reduceMotion: ReduceMotion.System };
    x.value = withTiming(-8, d, () => {
      x.value = withSpring(0, { damping: 6, stiffness: 400, reduceMotion: ReduceMotion.System });
    });
  }, [shakeKey, x]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={a}>{children}</Animated.View>;
}

/** Welcome: a ring ripples out behind a check that springs in, then the sheet hands back to the original action. */
function DoneStep({ name, returning }: { name: string; returning: boolean }) {
  const { c } = useTheme();
  const t = useT();
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.value = withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
  }, [ring]);
  const a = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 0.6 + ring.value * 1.2 }] }));
  return (
    <View style={{ alignItems: "center", gap: 14, paddingVertical: 28 }}>
      <View style={{ width: 88, height: 88, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute", width: 88, height: 88, borderRadius: 44, backgroundColor: c.liveSoft }, a]} />
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.liveSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="checkCircle" size={44} color={c.live} active enterDelay={80} />
        </View>
      </View>
      <Reveal index={1}>
        <Txt variant="heroTitle" style={{ textAlign: "center" }}>
          {t(returning ? "auth.welcomeBack" : "auth.welcome", { name })}
        </Txt>
      </Reveal>
    </View>
  );
}
