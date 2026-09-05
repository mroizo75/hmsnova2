"use client";

import { useState } from "react";
import { Facebook, Linkedin, Twitter, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareButtonsProps {
  url: string;
  title: string;
  variant?: "inline" | "compact";
  className?: string;
}

export function ShareButtons({ url, title, variant = "inline", className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:text-[#1877F2]",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:text-[#0A66C2]",
    },
    {
      name: "X",
      icon: Twitter,
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: "hover:text-foreground",
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1", className)} onClick={(e) => e.preventDefault()}>
        {shareLinks.map((link) => (
          <button
            key={link.name}
            title={`Del på ${link.name}`}
            className={cn("p-1.5 rounded-md text-muted-foreground transition-colors hover:bg-muted", link.color)}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(link.href, "_blank", "noopener,noreferrer"); }}
          >
            <link.icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); copyLink(); }}
          title="Kopier lenke"
          className="p-1.5 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Link2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground mr-1">Del:</span>
      {shareLinks.map((link) => (
        <Button key={link.name} variant="outline" size="sm" asChild className={link.color}>
          <a href={link.href} target="_blank" rel="noopener noreferrer" title={`Del på ${link.name}`}>
            <link.icon className="h-4 w-4 mr-1.5" />
            {link.name}
          </a>
        </Button>
      ))}
      <Button variant="outline" size="sm" onClick={copyLink} className="hover:text-primary">
        {copied ? <Check className="h-4 w-4 mr-1.5 text-green-600" /> : <Link2 className="h-4 w-4 mr-1.5" />}
        {copied ? "Kopiert!" : "Kopier lenke"}
      </Button>
    </div>
  );
}
