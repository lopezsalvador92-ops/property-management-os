"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060B12",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div style={{ marginBottom: 32, textAlign: "center" as const }}>
        <img
          src="/cape-logo.png"
          alt="Cape PM"
          style={{ height: 60, marginBottom: 16 }}
        />
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "rgba(237,241,245,0.55)",
          }}
        >
          Cape PM OS
        </div>
      </div>
      <SignIn
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: "#3A9BAA",
            colorBackground: "#111C2E",
            colorInputBackground: "#1A2740",
            colorInputText: "#EDF1F5",
            colorText: "#EDF1F5",
            colorTextOnPrimaryBackground: "#FFFFFF",
            colorTextSecondary: "#A0AEBF",
            colorNeutral: "#EDF1F5",
            borderRadius: "10px",
          },
          elements: {
            card: {
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.06)",
            },
            headerTitle: {
              color: "#EDF1F5",
              fontSize: "18px",
            },
            headerSubtitle: {
              color: "#A0AEBF",
            },
            formFieldLabel: {
              color: "#A0AEBF",
              fontSize: "13px",
            },
            formFieldInput: {
              backgroundColor: "#1A2740",
              color: "#EDF1F5",
              borderColor: "rgba(255,255,255,0.12)",
              fontSize: "14px",
            },
            formFieldInputShowPasswordButton: {
              color: "#A0AEBF",
            },
            footerActionLink: {
              color: "#3A9BAA",
            },
            formButtonPrimary: {
              backgroundColor: "#3A9BAA",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: "600",
            },
            dividerLine: {
              borderColor: "rgba(255,255,255,0.08)",
            },
            dividerText: {
              color: "#A0AEBF",
            },
            identityPreview: {
              color: "#EDF1F5",
            },
            identityPreviewText: {
              color: "#EDF1F5",
            },
            identityPreviewEditButton: {
              color: "#3A9BAA",
            },
            formFieldAction: {
              color: "#3A9BAA",
            },
            alert: {
              color: "#EDF1F5",
            },
          },
        }}
      />
    </div>
  );
}