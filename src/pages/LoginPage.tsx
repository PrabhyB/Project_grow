import { useState } from "react";
import type { FormEvent } from "react"; import { Link, useNavigate } 
from "react-router-dom"; import { loginUser } from 
"../services/authService"; export default function LoginPage() {
  const navigate = useNavigate(); const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); const [error, setError] = 
  useState(""); const [isSubmitting, setIsSubmitting] = useState(false); 
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setIsSubmitting(true); try { await 
      loginUser(email, password); navigate("/dashboard");
    } catch {
      setError("The email or password is incorrect.");
    } finally {
      setIsSubmitting(false);
    }
  }
  return ( <main style={pageStyle}> <form onSubmit={handleSubmit} 
      style={formStyle}>
        <h1>Log in to GrowHub</h1> <label> Email <input required 
            type="email" value={email} onChange={(event) => 
            setEmail(event.target.value)}
          /> </label> <label> Password <input required type="password" 
            value={password} onChange={(event) => 
            setPassword(event.target.value)}
          /> </label> {error && <p style={{ color: "crimson" }}>{error}</p>} 
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Logging in…" : "Log In"} </button> <p> Need an 
          account? <Link to="/signup">Sign up</Link>
        </p> </form> </main> );
}
const pageStyle = { display: "grid", minHeight: "100vh", placeItems: 
  "center", padding: "24px", fontFamily: "sans-serif",
};
const formStyle = { display: "flex", width: "min(420px, 100%)", 
  flexDirection: "column" as const, gap: "16px",
};
