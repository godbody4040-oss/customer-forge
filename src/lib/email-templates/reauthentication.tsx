import * as React from "react";

import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>REVORA</Text>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ReauthenticationEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};
const brand = {
  fontSize: "13px",
  letterSpacing: "3px",
  fontWeight: "bold" as const,
  color: "#A5741F",
  margin: "0 0 24px",
};
const container = {
  padding: "32px 28px",
  maxWidth: "560px",
  border: "1px solid #EDE7DA",
  borderRadius: "14px",
};
const h1 = {
  fontSize: "22px",
  fontWeight: "bold" as const,
  color: "#141210",
  margin: "0 0 20px",
};
const text = {
  fontSize: "14px",
  color: "#55575d",
  lineHeight: "1.5",
  margin: "0 0 25px",
};
const codeStyle = {
  fontFamily: "Courier, monospace",
  fontSize: "22px",
  fontWeight: "bold" as const,
  color: "#141210",
  margin: "0 0 30px",
};
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };
