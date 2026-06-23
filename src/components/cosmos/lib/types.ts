/* Shared types for the Cosmos Pay React islands. */
import type { Dispatch, SetStateAction } from "react";

export type Theme = "light" | "dark";
export type SetTheme = Dispatch<SetStateAction<Theme>>;

/* The signed-in developer, as passed from the server (Authentik session) into the islands. */
export interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  plan?: string;
}
