import { Link } from "react-router-dom"; export default function HomePage() 
{
  return ( <main style={{ display: "flex", flexDirection: "column", 
        justifyContent: "center", alignItems: "center", minHeight: "100vh", 
        gap: "20px", fontFamily: "sans-serif",
      }}
    >
      <h1>🌱 GrowHub</h1> <p>The future of smart home gardening.</p> <Link 
      to="/signup">
        <button type="button">Sign Up</button> </Link> <Link to="/login"> 
        <button type="button">Log In</button>
      </Link> </main> );
}
