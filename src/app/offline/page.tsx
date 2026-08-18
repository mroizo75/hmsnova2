import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Offline – HMS Nova",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <WifiOff className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Du er offline</h1>
        <p className="text-muted-foreground">
          Denne siden kunne ikke lastes fordi du mangler internettilkobling.
          Registreringer du allerede har lagret lokalt vil bli sendt automatisk
          når du er tilbake online.
        </p>
        <p className="text-sm text-muted-foreground">
          Prøv å laste siden på nytt når du har nettverkstilgang.
        </p>
      </div>
    </div>
  );
}
