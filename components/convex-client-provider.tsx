"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: "#154c79",
          colorBackground: "#ffffff",
          colorText: "#0f172a",
          colorTextSecondary: "#64748b",
          colorInputBackground: "#f8fafc",
          colorInputText: "#0f172a",
          borderRadius: "1rem",
        },
        elements: {
          card: "shadow-2xl border-none rounded-3xl bg-card/80 backdrop-blur-xl",
          headerTitle: "text-2xl font-black italic uppercase tracking-tight text-foreground",
          headerSubtitle: "text-muted-foreground font-bold uppercase text-[10px] tracking-widest",
          socialButtonsBlockButton: "rounded-2xl border-border hover:bg-muted/50 font-bold transition-all h-12",
          formButtonPrimary: "rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 font-black uppercase tracking-wider h-12 transition-all active:scale-95",
          formFieldInput: "rounded-2xl border-border bg-muted/50 font-bold h-12 focus:ring-2 ring-indigo-500/20",
          footerActionLink: "text-indigo-600 hover:text-indigo-700 font-black",
          identityPreviewText: "font-bold",
          userButtonAvatarBox: "rounded-xl",
        }
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

