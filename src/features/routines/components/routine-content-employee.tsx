import { getTranslations } from "next-intl/server";
import {
  RoutineStructuredBlocks,
  type RoutineStructuredLabels,
} from "@/features/routines/components/routine-structured-blocks";

export async function RoutineContentEmployee({ content }: { content: unknown }) {
  const t = await getTranslations("employeeRoutineDetailPage.content");

  const labels: RoutineStructuredLabels = {
    formaal: t("formaal"),
    omfang: t("omfang"),
    ansvar: t("ansvar"),
    gjennomforing: t("gjennomforing"),
    dokumentasjon: t("dokumentasjon"),
    avvikOppfolging: t("avvikOppfolging"),
    revisjon: t("revisjon"),
    kilder: t("kilder"),
    emptyMessage: t("emptyMessage"),
    legacyTextTitle: t("legacyTextTitle"),
  };

  return <RoutineStructuredBlocks content={content} labels={labels} density="comfortable" />;
}
