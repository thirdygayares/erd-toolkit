import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | ERD Toolkit",
  description: "Privacy policy for ERD Toolkit users.",
};

const privacySections = [
  {
    title: "1. Information We Collect",
    paragraphs: [
      "We collect account and authentication details (such as email address and OAuth account identifiers) required to provide secure access to ERD Toolkit.",
      "We also store project and schema content you create so you can access and manage your workspaces and diagrams.",
    ],
  },
  {
    title: "2. How We Use Information",
    paragraphs: [
      "We use collected information to operate the product, maintain security, support collaboration features, and improve reliability and performance.",
      "We do not use your project content for unrelated marketing campaigns.",
    ],
  },
  {
    title: "3. Cookies and Session Data",
    paragraphs: [
      "ERD Toolkit uses cookies and related session mechanisms to keep you signed in, protect against unauthorized requests, and maintain account state.",
      "If cookies are disabled, key authentication and workspace features may not function correctly.",
    ],
  },
  {
    title: "4. Data Sharing",
    paragraphs: [
      "We do not sell personal data.",
      "We may share information with trusted infrastructure providers that help us deliver hosting, authentication, and security operations under appropriate safeguards.",
    ],
  },
  {
    title: "5. Data Retention and Security",
    paragraphs: [
      "We retain data for as long as needed to provide the service, meet legal obligations, resolve disputes, and enforce agreements.",
      "We apply technical and organizational measures designed to protect data, but no system can guarantee absolute security.",
    ],
  },
  {
    title: "6. Your Choices",
    paragraphs: [
      "You may request access, correction, or deletion of account information as permitted by applicable law.",
      "You may also stop using the service at any time.",
    ],
  },
  {
    title: "7. Contact",
    paragraphs: [
      "For privacy-related requests, contact the ERD Toolkit team through the official product support channel.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="This policy describes how ERD Toolkit collects and handles data."
      lastUpdated="March 21, 2026"
      sections={privacySections}
    />
  );
}
