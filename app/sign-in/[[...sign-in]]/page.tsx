"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050912",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        padding: "32px 20px",
      }}
    >
      <div style={{ marginBottom: 36, textAlign: "center" as const }}>
        <img
          src="/cape-logo.png"
          alt="Cape PM"
          style={{ height: 64, display: "block", margin: "0 auto 18px", opacity: 0.95 }}
        />
        <div
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 26,
            fontWeight: 400,
            color: "#F2F5F9",
            marginBottom: 6,
            letterSpacing: "-0.005em",
          }}
        >
          Cape PM
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
            color: "#D4B57A",
          }}
        >
          Property Management OS
        </div>
        <div
          style={{
            display: "block",
            width: 36,
            height: 1,
            background: "rgba(212, 181, 122, 0.42)",
            margin: "14px auto 0",
          }}
        />
      </div>
      <SignIn
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: "#4FB5C4",
            colorBackground: "#131E2E",
            colorInputBackground: "#1B2740",
            colorInputText: "#F2F5F9",
            colorText: "#F2F5F9",
            colorTextOnPrimaryBackground: "#FFFFFF",
            colorTextSecondary: "rgba(242,245,249,0.78)",
            colorNeutral: "#F2F5F9",
            borderRadius: "10px",
            fontFamily: "'Inter', system-ui, sans-serif",
          },
          elements: {
            card: {
              boxShadow: "0 18px 40px -16px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.22)",
              border: "1px solid rgba(255,255,255,0.11)",
            },
            headerTitle: {
              color: "#F2F5F9",
              fontSize: "19px",
              fontWeight: "600",
            },
            headerSubtitle: {
              color: "rgba(242,245,249,0.78)",
            },
            formFieldLabel: {
              color: "rgba(242,245,249,0.78)",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            },
            formFieldInput: {
              backgroundColor: "#1B2740",
              color: "#F2F5F9",
              borderColor: "rgba(255,255,255,0.18)",
              fontSize: "14px",
            },
            formFieldInputShowPasswordButton: {
              color: "rgba(242,245,249,0.78)",
            },
            otpCodeFieldInput: {
              backgroundColor: "#1B2740",
              color: "#F2F5F9",
              borderColor: "rgba(255,255,255,0.18)",
              fontSize: "20px",
              fontWeight: "600",
            },
            otpCodeField: {
              color: "#F2F5F9",
            },
            formFieldSuccessText: {
              color: "#7DD9A3",
            },
            formFieldErrorText: {
              color: "#E08585",
            },
            formFieldWarningText: {
              color: "#DAA17F",
            },
            formFieldInfoText: {
              color: "rgba(242,245,249,0.78)",
            },
            footerActionLink: {
              color: "#D4B57A",
              fontWeight: "600",
            },
            formButtonPrimary: {
              backgroundColor: "#D4B57A",
              color: "#15202B",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            },
            formResendCodeLink: {
              color: "#D4B57A",
            },
            dividerLine: {
              borderColor: "rgba(255,255,255,0.11)",
            },
            dividerText: {
              color: "rgba(242,245,249,0.54)",
            },
            identityPreview: {
              color: "#F2F5F9",
            },
            identityPreviewText: {
              color: "#F2F5F9",
            },
            identityPreviewEditButton: {
              color: "#D4B57A",
            },
            formFieldAction: {
              color: "#D4B57A",
            },
            alert: {
              color: "#F2F5F9",
            },
            alertText: {
              color: "#F2F5F9",
            },
            alternativeMethodsBlockButton: {
              color: "rgba(242,245,249,0.78)",
              borderColor: "rgba(255,255,255,0.18)",
            },
            backLink: {
              color: "#D4B57A",
            },
          },
        }}
      />
      <div
        style={{
          marginTop: 32,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
          color: "rgba(242,245,249,0.42)",
        }}
      >
        Powered by Axvia Solutions
      </div>
    </div>
  );
}
