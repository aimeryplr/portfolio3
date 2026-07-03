import { useState } from "react";
import type { FormEvent } from "react";
import { Form } from "@heroui/react/form";
import { TextField } from "@heroui/react/textfield";
import { TextArea } from "@heroui/react/textarea";
import { Input } from "@heroui/react/input";
import { Label } from "@heroui/react/label";
import { FieldError } from "@heroui/react/field-error";
import { Button } from "@heroui/react/button";
import { Alert } from "@heroui/react/alert";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setErrorMessage("Network error, please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <Alert status="success" className="w-full max-w-120">
        <Alert.Content>
          <Alert.Description>Merci, votre message a bien été envoyé !</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <Form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-120">
      <TextField name="name" type="text" isRequired className="flex flex-col gap-1">
        <Label>Nom</Label>
        <Input />
        <FieldError className="text-danger text-sm" />
      </TextField>
      <TextField name="email" type="email" isRequired className="flex flex-col gap-1">
        <Label>Email</Label>
        <Input />
        <FieldError className="text-danger text-sm" />
      </TextField>
      <TextField name="message" isRequired className="flex flex-col gap-1">
        <Label>Message</Label>
        <TextArea rows={5} className="resize-none" />
        <FieldError className="text-danger text-sm" />
      </TextField>
      {status === "error" && (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{errorMessage}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <Button type="submit" isDisabled={status === "sending"} fullWidth>
        {status === "sending" ? "Envoi..." : "Envoyer"}
      </Button>
    </Form>
  );
}
