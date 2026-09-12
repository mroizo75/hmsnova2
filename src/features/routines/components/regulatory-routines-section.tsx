"use client";

import { useQuery } from "@tanstack/react-query";
import { RegulatoryRoutinePicker } from "@/features/regulatory/components/regulatory-routine-picker";
import { fetchRegulatoryRoutineSuggestions } from "@/server/queries/routine.queries";
import type { RegulatoryRoutineSuggestion } from "@/server/actions/regulatory.actions";

type Props = {
  initialSuggestions: RegulatoryRoutineSuggestion[];
};

export function RegulatoryRoutinesSection({ initialSuggestions }: Props) {
  const { data: suggestions } = useQuery({
    queryKey: ["regulatory-routine-suggestions"],
    queryFn: () => fetchRegulatoryRoutineSuggestions(),
    initialData: initialSuggestions,
  });

  if (!suggestions || suggestions.length === 0) return null;

  return <RegulatoryRoutinePicker suggestions={suggestions} />;
}
