import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Home } from "lucide-react";

export default function AvvikTakk() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="text-center py-12">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold mb-3">
            Takk for rapporten!
          </h1>

          <p className="text-muted-foreground mb-8">
            Avviket er registrert og HMS-ansvarlig er varslet.
            Du vil få beskjed når avviket er behandlet.
          </p>

          <div className="space-y-3">
            <Link href="/ansatt">
              <Button size="lg" className="w-full">
                <Home className="mr-2 h-5 w-5" />
                Tilbake til forsiden
              </Button>
            </Link>

            <Link href="/ansatt/avvik/ny">
              <Button variant="outline" size="lg" className="w-full">
                Rapporter nytt avvik
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

