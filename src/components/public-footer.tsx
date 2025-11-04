import Link from "next/link";
import { Facebook, Linkedin, Mail, Phone } from "lucide-react";
import Image from "next/image";

export function PublicFooter() {
  return (
    <footer className="bg-muted/30 border-t mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Image src="/logo-nova.png" alt="HMS Nova" width={155} height={150} />
            </div>
            <p className="text-sm text-muted-foreground">
            HMS Nova er utviklet av <a href="https://www.kksas.no/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-primary transition-colors">KKS AS</a> – en godkjent kursleverandør med over 15 års erfaring innen HMS og kompetanseutvikling.
            </p>
            <div className="flex space-x-3">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Besøk HMS Nova på Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Besøk HMS Nova på LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a 
                href="mailto:post@hmsnova.com" 
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Send e-post til HMS Nova"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Produkt */}
          <div>
            <h3 className="font-semibold mb-4">Produkt</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#funksjoner" className="text-muted-foreground hover:text-foreground transition-colors">
                  Funksjoner
                </Link>
              </li>
              <li>
                <Link href="/priser" className="text-muted-foreground hover:text-foreground transition-colors">
                  Priser
                </Link>
              </li>
              <li>
                <Link href="/bedriftshelsetjeneste" className="text-muted-foreground hover:text-foreground transition-colors">
                  Bedriftshelsetjeneste (BHT)
                </Link>
              </li>
              <li>
                <Link href="/hms-kurs" className="text-muted-foreground hover:text-foreground transition-colors">
                  HMS-kurs (KKS AS)
                </Link>
              </li>
              <li>
                <Link href="/gratis-hms-system" className="text-muted-foreground hover:text-foreground transition-colors">
                  Gratis HMS-system
                </Link>
              </li>
              <li>
                <Link href="/hva-er-hms-nova" className="text-muted-foreground hover:text-foreground transition-colors">
                  Om HMS Nova
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                  Logg inn
                </Link>
              </li>
            </ul>
          </div>

          {/* Ressurser */}
          <div>
            <h3 className="font-semibold mb-4">Ressurser</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/blogg" className="text-muted-foreground hover:text-foreground transition-colors">
                  HMS-blogg
                </Link>
              </li>
              <li>
                <Link href="/hms-handbok" className="text-muted-foreground hover:text-foreground transition-colors">
                  Gratis HMS-håndbok
                </Link>
              </li>
              <li>
                <Link href="/risikovurdering-mal" className="text-muted-foreground hover:text-foreground transition-colors">
                  Risikovurdering mal
                </Link>
              </li>
              <li>
                <Link href="/vernerunde-guide" className="text-muted-foreground hover:text-foreground transition-colors">
                  Vernerunde guide
                </Link>
              </li>
              <li>
                <Link href="/iso-9001-sjekkliste" className="text-muted-foreground hover:text-foreground transition-colors">
                  ISO 9001 sjekkliste
                </Link>
              </li>
              <li>
                <Link href="/hms-lover-regler" className="text-muted-foreground hover:text-foreground transition-colors">
                  HMS lover og regler
                </Link>
              </li>
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h3 className="font-semibold mb-4">Kontakt</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                <a href="mailto:post@kksas.no" className="text-muted-foreground hover:text-foreground transition-colors">
                  post@kksas.no
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                <div className="text-muted-foreground">
                  Kurs: <a href="tel:+4791540824" className="hover:text-foreground transition-colors" aria-label="Ring oss for HMS-kurs: +47 91 54 08 24">+47 91 54 08 24</a><br/>
                  Software: <a href="tel:+4799112916" className="hover:text-foreground transition-colors" aria-label="Ring oss for HMS Nova software: +47 99 11 29 16">+47 99 11 29 16</a>
                </div>
              </li>
              <li className="text-muted-foreground">
                <strong>KKS AS</strong><br />
                (Eier av HMS Nova)
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} <a href="https://www.kksas.no/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">KKS AS</a>. Alle rettigheter reservert.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/personvern" className="hover:text-foreground transition-colors">
              Personvern
            </Link>
            <Link href="/vilkar" className="hover:text-foreground transition-colors">
              Vilkår
            </Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

