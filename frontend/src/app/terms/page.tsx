import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Terms and Conditions | ERD Toolkit",
  description: "Terms and conditions for using ERD Toolkit.",
};

const termsSections = [
  {
    title: "1. Acceptance of Terms",
    paragraphs: [
      "By accessing or using ERD Toolkit, you agree to comply with these Terms and Conditions and all applicable laws.",
      "If you do not agree with these terms, do not use the service.",
    ],
  },
  {
    title: "2. Use of the Service",
    paragraphs: [
      "You may use ERD Toolkit to design, edit, and export database schemas for lawful business or personal purposes.",
      "You are responsible for maintaining the confidentiality of your account credentials and for activity that occurs under your account.",
    ],
  },
  {
    title: "3. User Content",
    paragraphs: [
      "You retain ownership of the schema definitions and related content you create in ERD Toolkit.",
      "You grant ERD Toolkit permission to process and store that content solely to operate, secure, and improve the service.",
    ],
  },
  {
    title: "4. Prohibited Conduct",
    paragraphs: [
      "You must not attempt to disrupt service operations, access unauthorized data, reverse engineer protected functionality, or use the service for unlawful activity.",
      "Violations may result in suspension or termination of access.",
    ],
  },
  {
    title: "5. Availability and Changes",
    paragraphs: [
      "We may update, modify, or discontinue features of ERD Toolkit at any time to improve security, reliability, or usability.",
      "We will make reasonable efforts to minimize disruption for active users.",
    ],
  },
  {
    title: "6. Limitation of Liability",
    paragraphs: [
      "ERD Toolkit is provided on an as-is and as-available basis without warranties of uninterrupted operation.",
      "To the maximum extent permitted by law, ERD Toolkit is not liable for indirect, incidental, or consequential damages resulting from use of the service.",
    ],
  },
  {
    title: "7. Contact",
    paragraphs: [
      "For legal or terms-related questions, contact the ERD Toolkit team through the official product support channel.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms and Conditions"
      description="These terms explain the rules for using ERD Toolkit."
      lastUpdated="March 21, 2026"
      sections={termsSections}
    />
  );
}
