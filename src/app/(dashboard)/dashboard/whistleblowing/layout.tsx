import { WhistleblowStepUpGate } from "@/features/whistleblowing/components/step-up-gate";

export default function WhistleblowingListLayout({ children }: { children: React.ReactNode }) {
  return <WhistleblowStepUpGate>{children}</WhistleblowStepUpGate>;
}
