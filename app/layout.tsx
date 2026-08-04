import "./globals.css";
import { AuthStatus } from "@/components/auth-status";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { ReactNode } from "react";

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;
const shouldEnableGoogleAnalytics =
  process.env.VERCEL_ENV === "production" && Boolean(gaMeasurementId);

export const metadata: Metadata = {
  title: "Arrange Route",
  description: "ダーツのアレンジを検討するサービス",
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="app-header">
          <Link href="/scores" className="app-header-title">
            <Image
              className="app-header-mark"
              src="/arrange-route-icon.png"
              alt=""
              width={40}
              height={40}
              priority
            />
            <span>
              <strong>Arrange Route</strong>
            </span>
          </Link>
          <AuthStatus />
        </header>
        <main className="container">{children}</main>
        {shouldEnableGoogleAnalytics ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
