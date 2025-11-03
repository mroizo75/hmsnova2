"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Download, Mail, Rocket, Loader2, Share2, Facebook, Linkedin } from "lucide-react";
import { getGeneratedDocument, getDownloadLinks, sendDocuments, trackDownload } from "@/server/actions/generator.actions";
import { useToast } from "@/hooks/use-toast";

function FerdigContent() {
  const searchParams = useSearchParams();
  const documentId = searchParams?.get("id");
  const { toast } = useToast();
  const [doc, setDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function loadDocument() {
      if (!documentId) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await getGeneratedDocument(documentId);
        if (result.success) {
          setDoc(result.data);
        }
      } catch (error) {
        console.error("Error loading document:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDocument();
  }, [documentId]);

  const handleDownload = async () => {
    if (!documentId) return;
    
    setIsDownloading(true);
    try {
      const result = await getDownloadLinks(documentId);
      
      if (result.success && result.data?.zip) {
        // Track download
        await trackDownload(documentId);
        
        // Open download link
        window.open(result.data.zip, '_blank');
        
        toast({
          title: "✅ Last ned startet!",
          description: "ZIP-filen lastes ned nå",
          className: "bg-green-50 border-green-200",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke hente nedlastingslenke",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Noe gikk galt ved nedlasting",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!documentId) return;
    
    setIsSending(true);
    try {
      const result = await sendDocuments(documentId);
      
      if (result.success) {
        toast({
          title: "✅ E-post sendt!",
          description: `Dokumentene er sendt til ${doc?.email}`,
          className: "bg-green-50 border-green-200",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke sende e-post",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Noe gikk galt ved sending av e-post",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleShare = (platform: 'facebook' | 'linkedin' | 'email') => {
    const url = encodeURIComponent('https://hmsnova.com/gratis-hms-system');
    const title = encodeURIComponent('Lag gratis HMS-system på 10 minutter med HMS Nova!');
    const description = encodeURIComponent('Få HMS-håndbok, risikovurdering, opplæringsplan og mer - helt gratis!');
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${title}&body=${description}%0A%0A${url}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Gratulerer!</h1>
          <p className="text-xl text-muted-foreground">
            Ditt HMS-system er klart!
          </p>
        </div>

        {/* Email Sent Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>E-post sendt!</CardTitle>
                <CardDescription>
                  Vi har sendt alle dokumentene til{" "}
                  <strong className="text-foreground">{doc?.email}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <h3 className="font-semibold mb-3">📥 Du har fått:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>HMS-håndbok for <strong>{doc?.companyName}</strong> (PDF - 42 sider)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Risikovurdering med forhåndsutfylte risikoer (Excel)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Opplæringsplan 2025 (PDF)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Vernerunde-plan (PDF + Excel)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>AMU-møteplan og referat-maler (Word)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <strong>KOMPLETT PAKKE</strong> - Alt i én ZIP (30+ filer)
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleDownload}
                disabled={isDownloading || !doc}
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isDownloading ? "Laster ned..." : "Last ned nå"}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleResendEmail}
                disabled={isSending || !doc}
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {isSending ? "Sender..." : "Send på e-post igjen"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              📧 Sjekk også spam-mappen hvis du ikke ser e-posten!
            </p>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🚀 Neste steg:</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center flex-shrink-0">
                  1
                </Badge>
                <div>
                  <p className="font-medium">Sjekk e-posten din</p>
                  <p className="text-muted-foreground">Last ned alle dokumenter (også spam-mappen)</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center flex-shrink-0">
                  2
                </Badge>
                <div>
                  <p className="font-medium">Les gjennom HMS-håndboken</p>
                  <p className="text-muted-foreground">Dette tar ca. 20 minutter</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center flex-shrink-0">
                  3
                </Badge>
                <div>
                  <p className="font-medium">Juster risikovurderingen</p>
                  <p className="text-muted-foreground">Tilpass til dine spesifikke arbeidsoppgaver</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center flex-shrink-0">
                  4
                </Badge>
                <div>
                  <p className="font-medium">Del med teamet</p>
                  <p className="text-muted-foreground">Send HMS-håndboken til alle ansatte</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* CTA - HMS Nova */}
        <Card className="bg-primary text-primary-foreground border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Vil du gjøre HMS enda enklere?</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Med HMS Nova kan du holde alt oppdatert automatisk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Digital signatur på skjemaer (juridisk bindende)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Automatiske påminnelser for opplæring og vernerunder</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Mobilapp for vernerunder på byggeplass</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>ISO 9001 compliance med ett klikk</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>7 roller med granulær tilgangsstyring</span>
              </li>
            </ul>

            <div className="pt-4">
              <Link href="/registrer-bedrift">
                <Button size="lg" variant="secondary" className="w-full">
                  <Rocket className="mr-2 h-5 w-5" />
                  Prøv HMS Nova gratis i 14 dager
                </Button>
              </Link>
              <p className="text-center text-xs text-primary-foreground/70 mt-2">
                Ingen kredittkort • Import dine dokumenter • Norsk support
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Share */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">❤️ Hjalp dette?</p>
          <p className="text-sm text-muted-foreground">
            Del med andre bedrifter som trenger HMS:
          </p>
          <div className="flex gap-3 justify-center mt-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleShare('facebook')}
            >
              <Facebook className="mr-2 h-4 w-4" />
              Facebook
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleShare('linkedin')}
            >
              <Linkedin className="mr-2 h-4 w-4" />
              LinkedIn
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleShare('email')}
            >
              <Mail className="mr-2 h-4 w-4" />
              E-post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FerdigGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <FerdigContent />
    </Suspense>
  );
}

