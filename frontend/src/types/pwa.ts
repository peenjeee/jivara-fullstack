export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

declare global {
  interface Window {
    __jivaraInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export {};
