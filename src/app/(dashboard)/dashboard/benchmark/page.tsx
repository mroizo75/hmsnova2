import { BarChart3 } from "lucide-react";
import { fetchBenchmarkData } from "@/server/queries/benchmark.queries";
import { BenchmarkContent } from "@/features/benchmark/components/benchmark-content";

export default async function BenchmarkPage() {
  const initialData = await fetchBenchmarkData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="h-8 w-8" />
          Bransje-benchmark
        </h1>
        <p className="text-muted-foreground mt-1">
          {initialData.isOptedIn && initialData.industryLabel
            ? `${initialData.industryLabel} — sammenlign din bedrift med bransjesnittet`
            : "Sammenlign din bedrift med andre i samme bransje"}
        </p>
      </div>

      <BenchmarkContent initialData={initialData} />
    </div>
  );
}
