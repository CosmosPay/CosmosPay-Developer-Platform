import { signIn, signOut } from "@/lib/auth-client";

export default function Buttons() {
  return (
    <div>
      <button
        id="login"
        onClick={() =>
          signIn.social({ provider: "ak", callbackURL: "/dashboard" })
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
