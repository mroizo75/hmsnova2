export const PWA_INSTALL_DISMISS_KEY = "hmsnova.pwa.installDismissed";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type InstallListener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<InstallListener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribePwaInstall(listener: InstallListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeferredPwaPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function setDeferredPwaPrompt(event: BeforeInstallPromptEvent | null): void {
  deferredPrompt = event;
  notify();
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return standalone || iosStandalone;
}

export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIos && isWebkit && !isOtherBrowser;
}

export function hasDismissedPwaInstall(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === "1";
}

export function dismissPwaInstallPrompt(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "1");
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const promptEvent = deferredPrompt;
  if (!promptEvent) return "unavailable";

  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  setDeferredPwaPrompt(null);
  if (outcome === "accepted") {
    dismissPwaInstallPrompt();
  }
  return outcome;
}

export async function runPwaInstallFromUserGesture(): Promise<void> {
  const { toast } = await import("sonner");
  const outcome = await promptPwaInstall();
  if (outcome === "accepted") {
    toast.success("HMS Nova er lagt til på skrivebordet.");
    return;
  }
  if (outcome === "dismissed") {
    dismissPwaInstallPrompt();
    return;
  }
  if (isIosSafari()) {
    toast("Legg til på Hjem-skjerm", {
      description: "Trykk Del-ikonet og velg «Legg til på Hjem-skjerm».",
      duration: 8000,
    });
    return;
  }
  toast("Kunne ikke åpne installasjon", {
    description: "Bruk installasjonsikonet i adressefeltet, eller prøv Chrome/Edge.",
    duration: 6000,
  });
}
