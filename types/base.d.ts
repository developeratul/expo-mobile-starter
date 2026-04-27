import { ReactNode } from "react";

declare global {
  interface AppProps {
    children: ReactNode;
  }
}
