import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Users } from "lucide-react";
import { getAllTeamMembers } from "@/lib/team";

export const metadata: Metadata = {
  title: "Vårt team | HMS Nova",
  description: "Møt teamet bak HMS Nova – HMS-eksperter, salg og HMS leder som hjelper norske bedrifter med trygghet og kvalitet.",
  openGraph: {
    title: "Vårt team | HMS Nova",
    description: "Møt teamet bak HMS Nova – HMS-eksperter, salg og HMS leder.",
  },
};

export default function TeamPage() {
  const members = getAllTeamMembers();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Vårt team</h1>
          <p className="text-xl text-muted-foreground">
            Vi som jobber med HMS Nova – fra produkt og salg til HMS-ledelse og opplæring.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {members.map((member) => (
            <Card
              key={member.slug}
              className="overflow-hidden transition-shadow hover:shadow-lg"
            >
              <div className="relative h-56 bg-muted">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover"
                  style={{ objectPosition: member.imagePosition ?? "top" }}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute bottom-3 left-3">
                  <Badge className="bg-primary/90 text-primary-foreground">
                    {member.teamLabel}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-1">{member.name}</h2>
                <p className="text-muted-foreground text-sm mb-4">{member.title}</p>
                <p className="text-sm line-clamp-3 mb-4">{member.bio}</p>
                <Link
                  href={`/forfatter/${member.slug}`}
                  className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:underline"
                >
                  Se profil
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-2xl mx-auto mt-16 text-center">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-8">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Trenger dere HMS-hjelp?</h2>
              <p className="text-muted-foreground mb-6">
                Ta kontakt med teamet for en uforpliktende samtale om HMS Nova, kurs eller bedriftshelsetjeneste.
              </p>
              <Link
                href="/registrer-bedrift"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Registrer bedrift
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
