import type { APIRoute } from "astro";
import { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } from "astro:env/server";
import { Resend } from "resend";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = { name: 100, email: 254, message: 5000 };

const field = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const POST: APIRoute = async ({ request }) => {
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    return Response.json({ error: "Le formulaire de contact n'est pas configuré." }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  // honeypot: bots fill every field, humans never see this one
  if (field(body.website)) {
    return Response.json({ success: true });
  }

  // no line breaks or control chars in the name, it ends up in the subject header
  const name = field(body.name).replace(/[\p{Cc}\p{Cf}]+/gu, " ").trim();
  const email = field(body.email);
  const message = field(body.message);

  if (!name || !email || !message) {
    return Response.json({ error: "Le nom, l'email et le message sont requis." }, { status: 400 });
  }
  if (name.length > MAX.name || email.length > MAX.email || message.length > MAX.message) {
    return Response.json({ error: "Un des champs est trop long." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Veuillez saisir une adresse email valide." }, { status: 400 });
  }

  const resend = new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: CONTACT_FROM_EMAIL,
    to: CONTACT_TO_EMAIL,
    replyTo: email,
    subject: `Portfolio contact from ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });

  if (error) {
    return Response.json({ error: "Échec de l'envoi du message. Veuillez réessayer plus tard." }, { status: 502 });
  }

  return Response.json({ success: true });
};
