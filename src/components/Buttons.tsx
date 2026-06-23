import { signIn, signOut } from "@/lib/auth-client";

export default function Buttons() {
  return (
    <div>
      <button
        id="login"
        onClick={() =>
          signIn.oauth2({ providerId: "ak", callbackURL: "/dashboard" })
        }
      >
        {" "}
        Login
      </button>
      <button id="logout" onClick={() => signOut()}>
        Logout
      </button>
    </div>
  );
}
