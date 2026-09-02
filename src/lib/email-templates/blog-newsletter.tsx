import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface BlogNewsletterEmailProps {
  recipientName?: string;
  posts: Array<{
    title: string;
    excerpt: string;
    slug: string;
    coverImage?: string;
    publishedAt: string;
  }>;
  unsubscribeUrl: string;
}

export const BlogNewsletterEmail = ({
  recipientName = "der",
  posts,
  unsubscribeUrl,
}: BlogNewsletterEmailProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hmsnova.no";

  return (
    <Html>
      <Head />
      <Preview>
        Nye HMS-artikler fra HMS Nova - {posts[0]?.title || "Les mer om HMS"}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src={`${baseUrl}/logo.png`}
              width="120"
              height="40"
              alt="HMS Nova"
              style={logo}
            />
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>Hei {recipientName}! 👋</Heading>
            
            <Text style={text}>
              Vi har publisert {posts.length === 1 ? "en ny artikkel" : `${posts.length} nye artikler`} på HMS Nova-bloggen. 
              Her er et sammendrag:
            </Text>

            {/* Blog Posts */}
            {posts.map((post, index) => (
              <Section key={index} style={postCard}>
                {post.coverImage && (
                  <Img
                    src={post.coverImage}
                    width="100%"
                    height="200"
                    alt={post.title}
                    style={postImage}
                  />
                )}
                
                <Heading style={postTitle}>{post.title}</Heading>
                
                <Text style={postExcerpt}>{post.excerpt}</Text>
                
                <Button
                  href={`${baseUrl}/blogg/${post.slug}`}
                  style={button}
                >
                  Les hele artikkelen →
                </Button>
              </Section>
            ))}

            {/* CTA Section */}
            <Section style={ctaSection}>
              <Heading style={h2}>HMS Nova bygger trygghet 🛡️</Heading>
              <Text style={text}>
                Visste du at HMS Nova er Norges mest moderne HMS-system? 
                Med digital signatur, mobilapp og ISO 9001 compliance.
              </Text>
              <Button
                href={`${baseUrl}/registrer-bedrift`}
                style={primaryButton}
              >
                Registrer bedrift
              </Button>
            </Section>

            {/* Footer */}
            <Section style={footer}>
              <Text style={footerText}>
                Du mottar denne e-posten fordi du har registrert deg for HMS Nova sitt nyhetsbrev.
              </Text>
              <Link href={unsubscribeUrl} style={unsubscribeLink}>
                Meld deg av nyhetsbrevet
              </Link>
              <Text style={footerText}>
                © {new Date().getFullYear()} HMS Nova AS. Alle rettigheter reservert.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BlogNewsletterEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "600px",
};

const header = {
  padding: "20px 0",
  textAlign: "center" as const,
  borderBottom: "1px solid #e6e6e6",
};

const logo = {
  margin: "0 auto",
};

const content = {
  padding: "30px 40px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "20px 0",
  padding: "0",
};

const h2 = {
  color: "#1a1a1a",
  fontSize: "22px",
  fontWeight: "bold",
  margin: "16px 0",
};

const text = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const postCard = {
  backgroundColor: "#f8f8f8",
  borderRadius: "8px",
  padding: "20px",
  margin: "20px 0",
  border: "1px solid #e6e6e6",
};

const postImage = {
  borderRadius: "6px",
  marginBottom: "12px",
  objectFit: "cover" as const,
};

const postTitle = {
  color: "#1a1a1a",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "12px 0 8px",
};

const postExcerpt = {
  color: "#737373",
  fontSize: "14px",
  lineHeight: "21px",
  margin: "8px 0 16px",
};

const button = {
  backgroundColor: "#22c55e",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const ctaSection = {
  backgroundColor: "#22c55e",
  borderRadius: "8px",
  padding: "30px",
  margin: "30px 0",
  textAlign: "center" as const,
};

const primaryButton = {
  backgroundColor: "#ffffff",
  borderRadius: "6px",
  color: "#22c55e",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 28px",
  margin: "12px 0",
};

const footer = {
  borderTop: "1px solid #e6e6e6",
  paddingTop: "20px",
  marginTop: "30px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#999",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "8px 0",
};

const unsubscribeLink = {
  color: "#999",
  fontSize: "12px",
  textDecoration: "underline",
  margin: "8px 0",
  display: "block",
};

