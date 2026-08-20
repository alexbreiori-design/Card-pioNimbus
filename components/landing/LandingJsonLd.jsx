export default function LandingJsonLd({ data }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      // JSON-LD must be raw JSON in the document for crawlers.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
