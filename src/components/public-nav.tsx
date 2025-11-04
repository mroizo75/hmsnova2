"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download, Menu, X } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { RegisterDialog } from "@/components/register-dialog";

export function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
              <Image src="/logo-nova.png" alt="HMS Nova" width={155} height={150} />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/#funksjoner" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Funksjoner
            </Link>
            <Link 
              href="/priser" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Priser
            </Link>
            <Link 
              href="/bedriftshelsetjeneste" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              BHT
            </Link>
            <Link 
              href="/hms-kurs" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Kurs
            </Link>
            <Link 
              href="/hva-er-hms-nova" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Om HMS Nova
            </Link>
            <Link 
              href="/gratis-hms-system" 
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Gratis HMS-system
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Logg inn
              </Button>
            </Link>
            <RegisterDialog>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Kom i gang
              </Button>
            </RegisterDialog>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Lukk meny" : "Åpne meny"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t">
            <Link 
              href="/#funksjoner" 
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Funksjoner
            </Link>
            <Link 
              href="/priser" 
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Priser
            </Link>
            <Link 
              href="/bedriftshelsetjeneste" 
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              BHT
            </Link>
            <Link 
              href="/hms-kurs" 
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Kurs
            </Link>
            <Link 
              href="/hva-er-hms-nova" 
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Om HMS Nova
            </Link>
            <Link 
              href="/gratis-hms-system" 
              className="block py-2 text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Download className="h-4 w-4" />
              Gratis HMS-system
            </Link>
            <div className="pt-3 space-y-2">
              <Link href="/login" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  Logg inn
                </Button>
              </Link>
              <RegisterDialog>
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                  Kom i gang
                </Button>
              </RegisterDialog>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

