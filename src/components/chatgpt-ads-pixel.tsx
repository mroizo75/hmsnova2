"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
const OPENAI_ADS_PIXEL_ID = "Ma7SyeFCFrbqHoatUtbLUn";

declare global {
  interface Window {
    oaiq?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

function marketingAllowed(): boolean {
  try {
    const raw = localStorage.getItem("cookie-consent");
    if (!raw) return false;
    const prefs = JSON.parse(raw) as { marketing?: boolean };
    return prefs.marketing === true;
  } catch {
    return false;
  }
}

function measurePage(pathname: string) {
  if (!window.oaiq || !marketingAllowed()) return;
  const id = pathname === "/" ? "home" : pathname.replace(/^\//, "").replaceAll("/", "-");
  window.oaiq("measure", "page_viewed", {
    type: "contents",
    contents: [{ id, name: document.title || pathname, content_type: "page" }],
  });
}

export function ChatGptAdsPixel() {
  const pathname = usePathname();
  const debug = process.env.NODE_ENV !== "production";

  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (!window.oaiq) {
        if (tries > 20) window.clearInterval(timer);
        return;
      }
      window.oaiq("consent", marketingAllowed());
      measurePage(pathname);
      window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [pathname]);

  useEffect(() => {
    const onConsent = () => {
      const allowed = marketingAllowed();
      window.oaiq?.("consent", allowed);
      if (allowed) measurePage(window.location.pathname);
    };
    window.addEventListener("cookie-consent-changed", onConsent);
    return () => window.removeEventListener("cookie-consent-changed", onConsent);
  }, []);

  return (
    <Script id="openai-ads-pixel" strategy="afterInteractive">
      {`!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("consent",false);oaiq("init",{pixelId:"${OPENAI_ADS_PIXEL_ID}",debug:${debug}});`}
    </Script>
  );
}
