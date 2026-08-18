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
    <nav className="sticky top-0 z-50 border-b bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
              <Image src="/logo-nova.png" alt="HMS Nova" width={155} height={150} />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden items-center gap-4 lg:flex xl:gap-6">
            <Link 
              href="/#funksjoner" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Funksjoner
            </Link>
            <Link 
              href="/bransjer" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Bransjer
            </Link>
            <Link 
              href="/priser" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Priser
            </Link>
            <Link 
              href="/digital-hms-tavle" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Digital HMS Tavle
            </Link>
            <Link 
              href="/hva-er-hms-nova" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Om HMS Nova
            </Link>
            <Link 
              href="/blogg" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              HMS-blogg
            </Link>
            <Link 
              href="/registrer-bedrift" 
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Prøv gratis
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-md lg:hidden"
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
          <div className="space-y-1 border-t py-4 lg:hidden">
            <Link 
              href="/#funksjoner" 
              className="flex min-h-11 items-center py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Funksjoner
            </Link>
            <Link 
              href="/bransjer" 
              className="flex min-h-11 items-center py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Bransjer
            </Link>
            <Link 
              href="/priser" 
              className="flex min-h-11 items-center py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Priser
            </Link>
            <Link 
              href="/digital-hms-tavle" 
              className="flex min-h-11 items-center py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Digital HMS Tavle
            </Link>
            <Link 
              href="/hva-er-hms-nova" 
              className="flex min-h-11 items-center py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Om HMS Nova
            </Link>
            <Link 
              href="/blogg" 
              className="flex min-h-11 items-center py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              HMS-blogg
            </Link>
            <Link 
              href="/registrer-bedrift" 
              className="flex min-h-11 items-center gap-1 py-3 text-sm font-medium text-primary hover:text-primary/80"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Download className="h-4 w-4" />
              Prøv gratis
            </Link>
            <div className="pt-3 space-y-2">
              <Link href="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  Logg inn
                </Button>
              </Link>
              <RegisterDialog onOpenChange={() => setMobileMenuOpen(false)}>
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

