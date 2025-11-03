import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, AlertCircle, Beaker, GraduationCap, Shield, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AnsattDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Velkommen-melding - Ren og profesjonell */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Velkommen, {session.user.name?.split(" ")[0]}! 👋
        </h2>
        <p className="text-gray-600">
          Her finner du alt du trenger for trygt arbeid
        </p>
      </div>

      {/* Viktige varsler */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-lg">Viktig melding</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Husk å lese gjennom HMS-håndboken før du starter arbeidsdag.
          </p>
        </CardContent>
      </Card>

      {/* Hovedfunksjoner - Store, touch-vennlige knapper */}
      <div className="grid grid-cols-2 gap-4">
        {/* Dokumenter */}
        <Link href="/ansatt/dokumenter">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Dokumenter</h3>
              <p className="text-xs text-muted-foreground">
                HMS-håndbok og prosedyrer
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Rapporter avvik */}
        <Link href="/ansatt/avvik/ny">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-destructive">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Rapporter</h3>
              <p className="text-xs text-muted-foreground">
                Meld fra om avvik
              </p>
              <Badge variant="destructive" className="mt-2 text-xs">
                Viktig!
              </Badge>
            </CardContent>
          </Card>
        </Link>

        {/* Stoffkartotek */}
        <Link href="/ansatt/stoffkartotek">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-accent">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                <Beaker className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Stoffer</h3>
              <p className="text-xs text-muted-foreground">
                Farlige stoffer og SDS
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Opplæring */}
        <Link href="/ansatt/opplaering">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <GraduationCap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Opplæring</h3>
              <p className="text-xs text-muted-foreground">
                Registrer gjennomført kurs
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Mine oppgaver */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Mine oppgaver
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <div>
                  <p className="font-medium text-sm">Årlig HMS-opplæring</p>
                  <p className="text-xs text-muted-foreground">Frist: 15. des</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white">
                Venter
              </Badge>
            </div>

            <div className="text-center py-4 text-sm text-muted-foreground">
              Du har ingen andre ventende oppgaver 👍
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nødkontakter */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-red-600">🚨 Nødkontakter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">Brann:</span>
            <a href="tel:110" className="text-red-600 font-bold text-lg">
              110
            </a>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Politi:</span>
            <a href="tel:112" className="text-red-600 font-bold text-lg">
              112
            </a>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Ambulanse:</span>
            <a href="tel:113" className="text-red-600 font-bold text-lg">
              113
            </a>
          </div>
          <div className="flex justify-between items-center border-t pt-2 mt-2">
            <span className="font-medium">HMS-ansvarlig:</span>
            <a href="tel:+4799112916" className="text-primary font-bold">
              +47 991 12 916
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

