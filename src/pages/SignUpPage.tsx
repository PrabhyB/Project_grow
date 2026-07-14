import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/authService";

export default function SignUpPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await registerUser(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Account creation failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <h1>Create your GrowHub account</h1>

        <label style={labelStyle}>
          Name
          <input
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label style={labelStyle}>
          Email
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label style={labelStyle}>
          Password
          <input
            required
            minLength={6}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating account…" : "Sign Up"}
        </button>

        <p>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}

const pageStyle = {
  display: "grid",
  minHeight: "100vh",
  placeItems: "center",
  padding: "24px",
  fontFamily: "sans-serif",
};

const formStyle = {
  display: "flex",
  width: "min(420px, 100%)",
  flexDirection: "column" as const,
  gap: "16px",
};

const labelStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
};
