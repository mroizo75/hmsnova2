import { Shield, Users, Award, Lock, CheckCircle2, Globe } from "lucide-react";

interface TrustBadgesProps {
  variant?: "default" | "compact";
  className?: string;
}

export function TrustBadges({ 
  variant = "default",
  className = "" 
}: TrustBadgesProps) {
  const badges = [
    {
      icon: Award,
      title: "ISO 9001-klar",
      description: "Følger ISO 9001:2015 kravene",
    },
    {
      icon: Lock,
      title: "GDPR Compliant",
      description: "Fullt GDPR-kompatibelt",
    },
    {
      icon: CheckCircle2,
      title: "Arbeidstilsynet",
      description: "Følger alle HMS-krav",
    },
    {
      icon: Users,
      title: "Norske Bedrifter",
      description: "Stoler på HMS Nova",
    },
    {
      icon: Shield,
      title: "EU/EØS-servere",
      description: "Data trygt innenfor EU/EØS",
    },
    {
      icon: Globe,
      title: "15 Års Erfaring",
      description: "HMS-ekspertise siden 2009",
    },
  ];

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-6 ${className}`}>
        {badges.map((badge, i) => (
          <div 
            key={i} 
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <badge.icon className="h-5 w-5 text-primary" />
            <span className="font-medium">{badge.title}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 ${className}`}>
      {badges.map((badge, i) => (
        <div 
          key={i} 
          className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <badge.icon className="h-10 w-10 text-primary mb-3" />
          <h3 className="font-semibold text-sm mb-1">{badge.title}</h3>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
        </div>
      ))}
    </div>
  );
}
